package org.com.dispatch.infrastructure.mq;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.client.consumer.DefaultMQPushConsumer;
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyContext;
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyStatus;
import org.apache.rocketmq.client.consumer.listener.MessageListenerConcurrently;
import org.apache.rocketmq.client.exception.MQClientException;
import org.apache.rocketmq.common.consumer.ConsumeFromWhere;
import org.apache.rocketmq.common.message.MessageExt;
import org.com.dispatch.infrastructure.connector.ConnectorDeliverClient;
import org.com.dispatch.infrastructure.grpc.SocialSessionGrpcClient;
import org.com.dispatch.route.GatewayRouteService;
import org.com.nettyconnector.proto.connector.tcp.v1.ChatDeliver;
import org.com.shared.proto.social.session.v1.SessionMember;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Configuration
@Slf4j
public class RocketMqConsumerConfiguration {

    private final SocialSessionGrpcClient socialSessionGrpcClient;
    private final GatewayRouteService gatewayRouteService;
    private final ConnectorDeliverClient connectorDeliverClient;

    @Value("${rocketmq.name-server:localhost:9876}")
    private String nameServer;

    @Value("${rocketmq.consumer.group:message-dispatch-consumer}")
    private String consumerGroup;

    @Value("${rocketmq.topic.message-persisted:im_message_persisted}")
    private String messagePersistedTopic;

    public RocketMqConsumerConfiguration(
            SocialSessionGrpcClient socialSessionGrpcClient,
            GatewayRouteService gatewayRouteService,
            ConnectorDeliverClient connectorDeliverClient
    ) {
        this.socialSessionGrpcClient = socialSessionGrpcClient;
        this.gatewayRouteService = gatewayRouteService;
        this.connectorDeliverClient = connectorDeliverClient;
    }

    @Bean(destroyMethod = "shutdown")
    public DefaultMQPushConsumer messagePersistedConsumer() throws MQClientException {
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer(consumerGroup);
        consumer.setNamesrvAddr(nameServer);
        consumer.setConsumeFromWhere(ConsumeFromWhere.CONSUME_FROM_LAST_OFFSET);
        consumer.subscribe(messagePersistedTopic, "*");
        consumer.registerMessageListener((MessageListenerConcurrently) this::consume);
        consumer.start();
        log.info("RocketMQ consumer started: group={}, nameServer={}, topic={}", consumerGroup, nameServer, messagePersistedTopic);
        return consumer;
    }

    private ConsumeConcurrentlyStatus consume(List<MessageExt> msgs, ConsumeConcurrentlyContext ctx) {
        if (msgs == null || msgs.isEmpty()) {
            return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
        }

        for (MessageExt msg : msgs) {
            if (msg == null) {
                continue;
            }
            String bodyStr;
            try {
                bodyStr = new String(msg.getBody(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                continue;
            }

            JSONObject body;
            try {
                body = JSON.parseObject(bodyStr);
            } catch (Exception e) {
                log.warn("mq body parse failed: msgId={}, err={}", msg.getMsgId(), e.toString());
                continue;
            }

            if (body == null) {
                continue;
            }

            String event = body.getString("event");
            if (event == null || !"MESSAGE_PERSISTED".equals(event)) {
                continue;
            }

            Long msgId = body.getLong("msgId");
            Long sessionId = body.getLong("sessionId");
            Long senderId = body.getLong("senderId");
            Integer partitionId = body.getInteger("partitionId");
            Long seq = body.getLong("seq");
            Integer type = body.getInteger("type");
            Integer appearance = body.getInteger("appearance");
            String content = body.getString("content");
            Long serverTimeMs = body.getLong("serverTimeMs");
            String traceId = body.getString("traceId");

            if (msgId == null || msgId <= 0 || sessionId == null || sessionId <= 0 || senderId == null || senderId <= 0) {
                continue;
            }

            ChatDeliver deliver = ChatDeliver.newBuilder()
                    .setServerMessageId(String.valueOf(msgId))
                    .setType(type == null ? 0 : type)
                    .setSenderId(senderId)
                    .setSessionId(sessionId)
                    .setContent(content == null ? "" : content)
                    .setServerTimeMs(serverTimeMs == null ? System.currentTimeMillis() : serverTimeMs)
                    .setPartitionId(partitionId == null ? 1 : partitionId)
                    .setSeq(seq == null ? 0 : seq)
                    .setAppearance(appearance == null ? 0 : appearance)
                    .build();

            List<SessionMember> members;
            try {
                members = socialSessionGrpcClient.listSessionMembers(sessionId).getMembersList();
            } catch (Exception e) {
                log.warn("listSessionMembers failed: sessionId={}, msgId={}, err={}", sessionId, msgId, e.toString());
                continue;
            }

            HashSet<Long> receiverIds = new HashSet<>(members.size());
            for (SessionMember m : members) {
                if (m == null || !m.getIsActive()) {
                    continue;
                }
                long receiverId = m.getUserId();
                if (receiverId <= 0) {
                    continue;
                }
                receiverIds.add(receiverId);
            }

            Map<Long, Map<String, String>> routesByUser = receiverIds.isEmpty()
                    ? Map.of()
                    : gatewayRouteService.listUserDeviceRoutesBatch(receiverIds);

            for (SessionMember m : members) {
                if (m == null || !m.getIsActive()) {
                    continue;
                }
                long receiverId = m.getUserId();
                if (receiverId <= 0) {
                    continue;
                }

                Map<String, String> routes = routesByUser.get(receiverId);
                if (routes == null || routes.isEmpty()) {
                    continue;
                }

                for (Map.Entry<String, String> it : routes.entrySet()) {
                    String deviceId = it.getKey();
                    String gatewayId = it.getValue();
                    if (gatewayId == null || gatewayId.isBlank()) {
                        continue;
                    }

                    connectorDeliverClient.deliver(gatewayId, receiverId, deviceId, deliver, traceId);
                }
            }
        }

        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
}
