package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.mail.cache.entity.CacheInvalidateMessage;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * RocketMQ缓存失效消息消费者
 * 处理缓存失效通知，实现分布式缓存一致性
 */
@Slf4j
@Component
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = "cache-invalidate-topic",
        consumerGroup = "cache-invalidate-consumer-group",
        maxReconsumeTimes = 3
)
public class CacheInvalidateConsumer implements RocketMQListener<CacheInvalidateMessage> {
    private final LocalCache localCache;
    private final DistributedCache distributedCache;

    @Override
    public void onMessage(CacheInvalidateMessage message) {
        if (message == null) {
            log.warn("Received null cache invalidate message");
            return;
        }

        try {
            log.debug("Processing cache invalidate message: cacheType={}, operation={}, targetId={}",
                    message.getCacheType(), message.getOperation(), message.getTargetId());
            switch (message.getCacheType()) {
                case CacheInvalidateMessage.CACHE_TYPE_GROUP_MEMBERS:
                    handleGroupMembersInvalidate(message);
                    break;
                case CacheInvalidateMessage.CACHE_TYPE_FRIEND_RELATION:
                    handleFriendRelationInvalidate(message);
                    break;
                case CacheInvalidateMessage.CACHE_TYPE_MUTE_INFO:
                    handleMuteInfoInvalidate(message);
                    break;
                default:
                    log.warn("Unknown cache type: {}", message.getCacheType());
                    break;
            }

            log.debug("Cache invalidate message processed successfully: {}", message);

        } catch (Exception e) {
            log.error("Failed to process cache invalidate message: {}", message, e);
            // 这里可以考虑重试机制或者死信队列
            throw new RuntimeException("Cache invalidate processing failed", e);
        }
    }

    /**
     * 处理群成员缓存失效
     */
    private void handleGroupMembersInvalidate(CacheInvalidateMessage message) {
        String targetId = message.getTargetId();
        String operation = message.getOperation();
        Map<String, Object> data = message.getData();

        try {
            Long groupId = Long.parseLong(targetId);

            switch (operation) {
                case CacheInvalidateMessage.OPERATION_ADD:
                    if (data != null && data.containsKey("userId")) {
                        Long userId = Long.parseLong(data.get("userId").toString());
                        distributedCache.addGroupMember(groupId, userId);
                        log.debug("Added group member via cache invalidate: groupId={}, userId={}", groupId, userId);
                    }
                    localCache.invalidateGroupMembers(groupId);
                    break;

                case CacheInvalidateMessage.OPERATION_REMOVE:
                    // 增量移除成员
                    if (data != null && data.containsKey("userId")) {
                        Long userId = Long.parseLong(data.get("userId").toString());
                        distributedCache.removeGroupMember(groupId, userId);
                        log.debug("Removed group member via cache invalidate: groupId={}, userId={}", groupId, userId);
                    }
                    localCache.invalidateGroupMembers(groupId);
                    break;

                case CacheInvalidateMessage.OPERATION_UPDATE:
                case CacheInvalidateMessage.OPERATION_CLEAR:
                    // 完全清除缓存，下次查询时从数据库重新加载
                    distributedCache.deleteGroupMembers(groupId);
                    localCache.invalidateGroupMembers(groupId);
                    log.debug("Cleared group members cache via invalidate: groupId={}", groupId);
                    break;

                default:
                    log.warn("Unknown group members operation: {}", operation);
                    break;
            }

        } catch (NumberFormatException e) {
            log.error("Invalid groupId format: {}", targetId, e);
        }
    }

    /**
     * 处理好友关系缓存失效
     */
    private void handleFriendRelationInvalidate(CacheInvalidateMessage message) {
        String targetId = message.getTargetId();
        String operation = message.getOperation();
        try {
            String[] userIds = targetId.split("_");
            if (userIds.length != 2) {
                log.error("Invalid friend relation targetId format: {}", targetId);
                return;
            }

            Long userId1 = Long.parseLong(userIds[0]);
            Long userId2 = Long.parseLong(userIds[1]);

            switch (operation) {
                case CacheInvalidateMessage.OPERATION_ADD:
                    distributedCache.putFriendRelation(userId1, userId2, true);
                    localCache.putFriendRelation(userId1, userId2, true);
                    log.debug("Added friend relation via cache invalidate: userId1={}, userId2={}", userId1, userId2);
                    break;
                case CacheInvalidateMessage.OPERATION_REMOVE:
                    distributedCache.putFriendRelation(userId1, userId2, false);
                    localCache.putFriendRelation(userId1, userId2, false);
                    log.debug("Removed friend relation via cache invalidate: userId1={}, userId2={}", userId1, userId2);
                    break;
                case CacheInvalidateMessage.OPERATION_UPDATE:
                    break;
                case CacheInvalidateMessage.OPERATION_CLEAR:
                    distributedCache.deleteFriendRelation(userId1, userId2);
                    localCache.invalidateFriendRelation(userId1, userId2);
                    log.debug("Cleared friend relation cache via invalidate: userId1={}, userId2={}", userId1, userId2);
                    break;

                default:
                    log.warn("Unknown friend relation operation: {}", operation);
                    break;
            }
        } catch (NumberFormatException e) {
            log.error("Invalid userId format in targetId: {}", targetId, e);
        }
    }

    /**
     * 处理禁言信息缓存失效
     */
    private void handleMuteInfoInvalidate(CacheInvalidateMessage message) {
        String targetId = message.getTargetId();
        String operation = message.getOperation();
        Map<String, Object> data = message.getData();

        try {
            switch (operation) {
                case CacheInvalidateMessage.OPERATION_ADD:
                case CacheInvalidateMessage.OPERATION_UPDATE:
                    // 更新禁言信息（需要从data中获取具体的禁言信息）
                    if (data != null) {
                        updateMuteInfoFromData(targetId, data);
                    } else {
                        // 如果没有具体数据，则清除缓存让其重新从数据库加载
                        clearMuteInfoCache(targetId);
                    }
                    break;

                case CacheInvalidateMessage.OPERATION_REMOVE:
                case CacheInvalidateMessage.OPERATION_CLEAR:
                    // 清除禁言信息缓存
                    clearMuteInfoCache(targetId);
                    log.debug("Cleared mute info cache via invalidate: targetId={}", targetId);
                    break;

                default:
                    log.warn("Unknown mute info operation: {}", operation);
                    break;
            }

        } catch (Exception e) {
            log.error("Failed to handle mute info invalidate: targetId={}", targetId, e);
        }
    }

    /**
     * 从消息数据中更新禁言信息
     */
    private void updateMuteInfoFromData(String targetId, Map<String, Object> data) {
        // 这里需要根据实际的MuteInfo数据结构来解析
        // 由于涉及到具体的业务逻辑，这里只做示例实现

        // 示例：假设data中包含了完整的MuteInfo信息
        // MuteInfo muteInfo = parseMuteInfoFromData(data);
        // if (muteInfo != null) {
        //     if (targetId.contains("_")) {
        //         // 用户禁言：userId_groupId
        //         String[] ids = targetId.split("_");
        //         Long userId = Long.parseLong(ids[0]);
        //         Long groupId = Long.parseLong(ids[1]);
        //         distributedCache.putUserMuteInfo(userId, groupId, muteInfo);
        //         verifyCache.putUserMuteInfo(userId, groupId, muteInfo);
        //     } else {
        //         // 群禁言：groupId
        //         Long groupId = Long.parseLong(targetId);
        //         distributedCache.putGroupMuteInfo(groupId, muteInfo);
        //         verifyCache.putGroupMuteInfo(groupId, muteInfo);
        //     }
        // }

        // 暂时先清除缓存，让其重新从数据库加载
        clearMuteInfoCache(targetId);
        log.debug("Updated mute info cache via invalidate: targetId={}", targetId);
    }

    /**
     * 清除禁言信息缓存
     */
    private void clearMuteInfoCache(String targetId) {
        try {
            if (targetId.contains("_")) {
                String[] ids = targetId.split("_");
                Long userId = Long.parseLong(ids[0]);
                Long groupId = Long.parseLong(ids[1]);
                distributedCache.deleteUserMuteInfo(userId, groupId);
                localCache.invalidateUserMuteInfo(userId, groupId);
            } else {
                Long groupId = Long.parseLong(targetId);
                distributedCache.deleteGroupMuteInfo(groupId);
                localCache.invalidateGroupMuteInfo(groupId);
            }
        } catch (NumberFormatException e) {
            log.error("Invalid targetId format for mute info: {}", targetId, e);
        }
    }

    /**
     * 检查消息是否过期（可选的消息去重机制）
     */
    private boolean isMessageExpired(CacheInvalidateMessage message) {
        if (message.getTimestamp() == null) {
            return false;
        }

        // 消息超过5分钟认为过期
        long expireThreshold = 5 * 60 * 1000; // 5分钟
        return System.currentTimeMillis() - message.getTimestamp() > expireThreshold;
    }

    /**
     * 消息处理失败时的回调（可以用于监控和告警）
     */
    private void onMessageProcessFailed(CacheInvalidateMessage message, Exception e) {
        log.error("Cache invalidate message processing failed, will retry. Message: {}", message, e);

        // 这里可以添加监控指标
        // meterRegistry.counter("cache.invalidate.failed",
        //     "cache_type", message.getCacheType(),
        //     "operation", message.getOperation()).increment();

        // 可以考虑发送告警通知
        // alertService.sendAlert("Cache invalidate failed", message.toString(), e);
    }
}
