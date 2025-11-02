package org.com.modules.mail.consumer;

import com.alibaba.fastjson.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.modules.mail.service.impl.MailBoxServiceImpl;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * 消息聚合消费者
 * @author lanye
 * @since 2025/10/21 16:30
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MQConstant.AGGREGATE_TOPIC, consumerGroup = MQConstant.AGGREGATE_MANAGER_GROUP, maxReconsumeTimes = 3)
public class AggregateConsumer implements RocketMQListener<String> {
    private final RedissonClient redisson;
    private final RocketMQTemplate rocketMQTemplate;
    /**
     * 消费者
     * @see
     * org.com.modules.mail.consumer.ChatConsumer
     */

    private static final String AGGREGATION_SET_PREFIX = "group:agg:";
    private final MailBoxServiceImpl mailBoxService;

    @Override
    public void onMessage(String json) {
        try {
            AggregateDTO aggregateDTO = JSON.parseObject(json, AggregateDTO.class);
            String key = getGroupKey(aggregateDTO);

            RSet<String> memberSets = redisson.getSet(key, StringCodec.INSTANCE);
            Set<String> userIdStrings = memberSets.readAll();
            memberSets.delete();
            if (!userIdStrings.isEmpty()) {
                // 将字符串转换为 Long 类型
                java.util.List<Long> userIds = userIdStrings.stream()
                        .map(Long::parseLong)
                        .toList();
                Message<String> chatDTO = mailBoxService.aggregateDTOConvertChatDTO(aggregateDTO, userIds);
                rocketMQTemplate.syncSend(MQConstant.SESSION_TOPIC, chatDTO);  // 生成 ChatDTO 发给 ChatConsumer, fromUid是0，表示系统消息
                log.info("发送聚合消息，群组: {}, 用户数: {}", aggregateDTO.getGroupId(), userIds.size());
            }
        } catch (Exception e){
            log.error("聚合消息处理失败，消息: {}", json, e);
            throw e;
        }
    }

    private String getGroupKey(AggregateDTO dto){
        return AGGREGATION_SET_PREFIX + dto.getGroupId() + ":" + dto.getAggregateType();
    }
}
