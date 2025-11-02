package org.com.modules.mail.producer;

import com.alibaba.fastjson.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

/**
 * 聚合消息的生产者
 * @author lanye
 * @since 2025/11/02 22:51
 */

@Slf4j
@Component
@RequiredArgsConstructor
public class AggregateProducer {
    private final RocketMQTemplate rocketMQTemplate;
    /**
     * 消费者
     * @see
     * org.com.modules.mail.consumer.AggregateConsumer
     */

    private final RedissonClient redisson;

    private static final String AGGREGATION_SET_PREFIX = "group:agg:";
    private static final String AGGREGATE_LUA_SCRIPT =
            "local key = KEYS[1] " +
                    "local expireTime = tonumber(ARGV[1]) " +
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

    // 清除旧的脚本缓存，确保使用最新的脚本
    @PostConstruct
    public void init() {
        try {
            redisson.getScript().scriptFlush();
            log.info("Redis script cache cleared successfully");
        } catch (Exception e) {
            log.warn("Failed to clear Redis script cache: {}", e.getMessage());
        }
    }

    public void produceAggregateEvent(AggregateDTO dto){
        if (dto.getUserIds() == null || dto.getUserIds().isEmpty()) {
            log.warn("用户ID列表为空，跳过聚合: {}", dto);
            return;
        }
        String groupKey = getGroupKey(dto);

        // 构建字符串参数数组
        String[] stringArgs = new String[dto.getUserIds().size() + 1];
        stringArgs[0] = "10";
        for (int i = 0; i < dto.getUserIds().size(); i++) {
            stringArgs[i + 1] = dto.getUserIds().get(i).toString();
        }

        // 使用 StringCodec 避免 ByteBuf 序列化问题
        Long result = redisson.getScript(StringCodec.INSTANCE).eval(
                org.redisson.api.RScript.Mode.READ_WRITE,
                AGGREGATE_LUA_SCRIPT,
                org.redisson.api.RScript.ReturnType.INTEGER,
                java.util.Arrays.asList(groupKey),
                (Object[]) stringArgs
        );

        if (result == 1L) {
            Message<String> message = MessageBuilder.withPayload(JSON.toJSONString(dto)).build();
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
