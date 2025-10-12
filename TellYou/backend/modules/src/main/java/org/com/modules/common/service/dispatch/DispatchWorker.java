package org.com.modules.common.service.dispatch;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.common.service.retry.MessageRetryService;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.user.domain.vo.resp.ContactApplyResp;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RTopic;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MQConstant.GROUP_TOPIC, consumerGroup = MQConstant.BROADCAST_GROUP + "-${server.node}")
public class DispatchWorker implements RocketMQListener<SubscribedItem> {
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
        if (item.getClass() == MessageResp.class){
            return ((MessageResp)item).getToUserId();
        }
        if (item.getClass() == ContactApplyResp.class){
            return ((ContactApplyResp)item).getDeliverId();
        }
        return null;
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
