package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.MessageModel;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.mail.cache.entity.CacheMissMessage;
import org.springframework.stereotype.Component;

/**
 * RocketMQ 缓存失效消息消费者 <br><br>
 * 目标：实现分布式缓存一致性 <br><br>
 * <ul>
 *     <li>使用 RocketMQ 的广播模式确保所有节点都能收到消息并清理本地缓存</li>
 *     <li>发送轻量级广播，通知缓存失效</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@RocketMQMessageListener(
    topic = "cache-invalidate-topic",
    consumerGroup = "cache-invalidate-consumer-group",
    maxReconsumeTimes = 3,
    messageModel = MessageModel.BROADCASTING
)
public class CacheMissConsumer implements RocketMQListener<CacheMissMessage> {
    private final LocalCache localCache;

    @Override
    public void onMessage(CacheMissMessage message) {
        if (message == null) {
            log.warn("Received null cache invalidate message");
            return;
        }
        log.info("Processing cache invalidate message: {}", message.toString());
        switch (message.getCacheType()) {
            case CacheMissMessage.CACHE_TYPE_GROUP_MEMBERS:
                handleGroupMembersInvalidate(message);
                break;
            case CacheMissMessage.CACHE_TYPE_FRIEND_RELATION:
                handleFriendRelationInvalidate(message);
                break;
            case CacheMissMessage.CACHE_TYPE_MUTE_INFO:
                handleMuteInfoInvalidate(message);
                break;
            default:
                log.warn("Unknown cache type: {}", message.getCacheType());
        }
        log.debug("Cache invalidate message processed successfully: {}", message);
    }

    /**
     * 处理群成员缓存失效
     */
    private void handleGroupMembersInvalidate(CacheMissMessage message) {
        message.getKeys().forEach(key -> localCache.invalidateGroupMembers(Long.parseLong(key)));
    }

    /**
     * 处理好友关系缓存失效
     */
    private void handleFriendRelationInvalidate(CacheMissMessage message) {

    }

    /**
     * 处理禁言信息缓存失效，全局永久禁言失效(一般是群主操作更改)，或者局部禁言撤销(这个暂时不做，禁言后不能撤销)
     */
    private void handleMuteInfoInvalidate(CacheMissMessage message) {

    }
}
