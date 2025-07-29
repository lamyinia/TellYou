package org.com.modules.chat.subscriber;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.chat.service.retry.MessageRetryService;
import org.com.modules.chat.utils.MessageConvertUtil;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MQConstant.GROUP_TOPIC,
        consumerGroup = MQConstant.BROADCAST_GROUP + "-${server.node}"
)
public class DispatcherSubscriber implements RocketMQListener<SubscribedItem> {
    @Value("${server.node}")
    private String node;

    private final RedissonClient redissonClient;
    private final MessageRetryService messageRetryService;
    private final MessageConvertUtil messageConvertUtil;

    @PostConstruct
    public void deliverOnSubscriber(){
        RTopic topic = redissonClient.getTopic(node);
        topic.addListener(SubscribedItem.class, (channel, item) -> {
            List<Long> uidList = item.getUidList();
            uidList.forEach(uid -> {
                messageRetryService.retryDelivery(uid, item.getVo());
            });
        });
    }


    @Override
    public void onMessage(SubscribedItem item) {
        if (item.getVo() == null){
            log.info("{} 消息为空", item.getUidList().toString());
            return;
        }

        log.info("广播发出消息: {}", item);
        messageRetryService.retryPublish(item.getUidList(), item.getVo());
    }
}
