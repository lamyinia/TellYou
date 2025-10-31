package org.com.modules.deliver.service.dispatch;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.deliver.service.retry.MessageRetryService;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.modules.deliver.domain.vo.push.PushedApply;
import org.com.modules.deliver.domain.vo.push.PushedSession;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 消息分发服务的监听器
 * @author lanye
 * @since 2025/10/31 15:02
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MQConstant.BROADCAST_TOPIC, consumerGroup = MQConstant.BROADCAST_GROUP + "-${server.node}")
public class DispatchListener implements RocketMQListener<SubscribedItem> {
    @Value("${server.node}")
    private String node;

    private final RedissonClient redissonClient;
    private final MessageRetryService messageRetryService;

    @PostConstruct
    public void deliverOnSubscriber(){
        RTopic topic = redissonClient.getTopic(node);
        topic.addListener(Object.class, (channel, item) -> {
            Long uid = getUid(item);
            if (uid != null){
                messageRetryService.retryDelivery(uid, item);
            }
        });
    }

    private Long getUid(Object item){
        return switch (item){
            case PushedChat p -> p.getReceiverId();
            case PushedSession p -> p.getReceiverId();
            case PushedApply p -> p.getReceiverId();
            default -> throw new IllegalStateException("Unexpected value: " + item);
        };
    }


    @Override
    public void onMessage(SubscribedItem item) {
        if (item.getVo() == null || item.uidList == null){
            log.info("{} 消息为空", item.getUidList().toString());
            return;
        }

        log.info("广播发出消息: {}", item);
        messageRetryService.retryPublish(item.getUidList(), item.getVo());
    }
}
