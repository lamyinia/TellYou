package org.com.modules.mail.consumer;

import com.alibaba.fastjson.JSON;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.mail.service.MailBoxService;
import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.deliver.event.ChatSendEvent;
import org.com.modules.common.util.ApplicationContextProvider;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.modules.group.service.adapter.MessageAdapter;
import org.com.tools.constant.MQConstant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author: lanye
 * @date: 2025/07/27 20:28
 * @description 私聊消息的消费者
 * @replenish 在多人群聊中，精准投递的主要开销主要是在路由表的开销，但如果是单聊，必须精准投递
 * @主要业务逻辑： 1) 信息持久化在信箱(mongodb)；
 * 2) 通知在线的用户；
 * @description 群聊消息的消费者
 * @replenish 多人群聊中，由于精准投递中写扩散中查路由表的开销很大，在节点不多的情况下，可以采取集群广播的方式(如果节点很多，当然也可以混合路由去优化)
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MQConstant.SESSION_TOPIC,
        consumerGroup = MQConstant.SESSION_GROUP,
        consumeMode = org.apache.rocketmq.spring.annotation.ConsumeMode.CONCURRENTLY,
        maxReconsumeTimes = 3
)
public class ChatConsumer implements RocketMQListener<String> {
    private final ApplicationEventPublisher applicationEventPublisher;
    private final MessageAdapter messageAdapter;
    private final MailBoxService mailBoxService;

    @PostConstruct
    public void init() {
        log.info("ChatConsumer 已启动，监听主题: {}, 消费者组: {}",
                MQConstant.SESSION_TOPIC, MQConstant.SESSION_GROUP);
        log.info("RocketMQ配置 - NameServer: 127.0.0.1:9876");
    }

    @SneakyThrows
    @Override
    public void onMessage(String text) {
        ChatDTO req = JSON.parseObject(text, ChatDTO.class);
        ChatConsumer proxy = (ChatConsumer) ApplicationContextProvider.currentProxy();
        proxy.consumeMessage(req);
    }

    @FlowControl(time = 10, count = 100, spEl = "#req.fromUid", target = FlowControl.Target.EL)
    public void consumeMessage(ChatDTO req) {
        log.info("ChatConsumer 正在消费消息: {}", req.toString());

        MessageDoc messageDoc = messageAdapter.buildMessage(req);
        List<Long> uidList = getUidList(req);
        mailBoxService.insertChatMessage(messageDoc, uidList);
        applicationEventPublisher.publishEvent(new ChatSendEvent(this, messageDoc, uidList));
    }

    /**
     * 用户发消息，校验用户对会话的权限，如果非法，发布异步事件通知客户端
     */
    private List<Long> getUidList(ChatDTO req) {
        if (req.getToUserId() < 0) {
            return null;
        } else {
            return List.of(req.getFromUid(), req.getToUserId());
        }
    }
}
