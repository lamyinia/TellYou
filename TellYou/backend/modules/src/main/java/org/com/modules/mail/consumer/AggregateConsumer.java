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
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
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
    private static final String AGGREGATION_SET_PREFIX = "group:agg:";
    private final MailBoxServiceImpl mailBoxService;

    // Lua脚本：原子性检查集合是否为空并添加元素
    private static final String AGGREGATE_LUA_SCRIPT =
        "local key = KEYS[1] " +
        "local expireTime = ARGV[1] " +
        "local isEmpty = redis.call('EXISTS', key) == 0 " +
        "for i = 2, #ARGV do " +
        "    redis.call('SADD', key, ARGV[i]) " +
        "end " +
        "if isEmpty then " +
        "    redis.call('EXPIRE', key, expireTime) " +
        "    return 1 " +
        "else " +
        "    return 0 " +
        "end";

    @Override
    public void onMessage(String json) {
        try {
            AggregateDTO aggregateDTO = JSON.parseObject(json, AggregateDTO.class);
            String key = getGroupKey(aggregateDTO);

            RSet<Long> memberSets = redisson.getSet(key);
            Set<Long> userIds = memberSets.readAll();
            memberSets.delete();
            if (!userIds.isEmpty()) {
                Message<String> chatDTO = mailBoxService.produceChatDTO(aggregateDTO, userIds.stream().toList());
                rocketMQTemplate.syncSend(MQConstant.SESSION_TOPIC, chatDTO);  // 生成 ChatDTO 发给 ChatConsumer, fromUid是0，表示系统消息
                log.info("发送聚合消息，群组: {}, 用户数: {}", aggregateDTO.getGroupId(), userIds.size());
            }
        } catch (Exception e){
            log.error("聚合消息处理失败，消息: {}", json, e);
            throw e;
        }
    }

    public void produceAggregateEvent(AggregateDTO dto){
        if (dto.getUserIds() == null || dto.getUserIds().isEmpty()) {
            log.warn("用户ID列表为空，跳过聚合: {}", dto);
            return;
        }
        String groupKey = getGroupKey(dto);

        Object[] args = new Object[dto.getUserIds().size() + 1];
        args[0] = "10";
        for (int i = 0; i < dto.getUserIds().size(); i++) {
            args[i + 1] = dto.getUserIds().get(i).toString();
        }

        Long result = (Long) redisson.getScript().eval(
            org.redisson.api.RScript.Mode.READ_WRITE,
            AGGREGATE_LUA_SCRIPT,
            org.redisson.api.RScript.ReturnType.INTEGER,
            java.util.Arrays.asList(groupKey),
            args
        );

        // 只有首次操作才发送延迟消息
        if (result == 1L) {
            // 使用正确的延迟消息方法
            Message<String> message = MessageBuilder
                    .withPayload(JSON.toJSONString(dto))
                    .build();
            rocketMQTemplate.syncSend(MQConstant.AGGREGATE_TOPIC, message, 5000, 2);

            log.info("发送聚合延迟消息，群组: {}, 类型: {}", dto.getGroupId(), dto.getAggregateType());
        } else {
            log.info("添加到现有聚合，群组: {}, 类型: {}, 用户: {}",
                    dto.getGroupId(), dto.getAggregateType(), dto.getUserIds());
        }
    }

    private String getGroupKey(AggregateDTO dto){
        return AGGREGATION_SET_PREFIX + dto.getGroupId() + ":" + dto.getAggregateType();
    }
}
