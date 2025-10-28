package org.com.modules.mail.cache;

import org.com.modules.mail.cache.entity.MuteInfo;
import org.redisson.api.RBucket;
import org.redisson.api.RSet;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;

/**
 * Redisson分布式缓存管理器
 * 作为二级缓存，提供跨节点的数据一致性
 */
@Component
public class DistributedCache {

    private static final Logger log = LoggerFactory.getLogger(DistributedCache.class);

    @Autowired
    private RedissonClient redissonClient;

    @Value("${cache.redis.group-members.ttl:7200}")
    private long groupMembersTtlSeconds;

    @Value("${cache.redis.friend-relation.ttl:21600}")
    private long friendRelationTtlSeconds;

    @Value("${cache.redis.mute-info.ttl:3600}")
    private long muteInfoTtlSeconds;

    private static final String REDIS_KEY_PREFIX = "tellyou:cache:";
    private static final String GROUP_MEMBERS_KEY_PREFIX = REDIS_KEY_PREFIX + "group:members:";
    private static final String FRIEND_RELATION_KEY_PREFIX = REDIS_KEY_PREFIX + "friend:relation:";
    private static final String GROUP_MUTE_KEY_PREFIX = REDIS_KEY_PREFIX + "mute:group:";
    private static final String USER_MUTE_KEY_PREFIX = REDIS_KEY_PREFIX + "mute:user:";

    /**
     * 获取群成员列表
     */
    public Set<Long> getGroupMembers(Long groupId) {
        try {
            String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
            RSet<Long> rSet = redissonClient.getSet(key);

            if (rSet.isExists()) {
                Set<Long> members = rSet.readAll();
                log.debug("Retrieved group members from Redis: groupId={}, memberCount={}",
                        groupId, members.size());
                return members;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get group members from Redis: groupId={}", groupId, e);
            return null;
        }
    }

    /**
     * 缓存群成员列表
     */
    public void putGroupMembers(Long groupId, Set<Long> members) {
        try {
            String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
            RSet<Long> rSet = redissonClient.getSet(key);

            // 清空现有数据并添加新数据
            rSet.clear();
            rSet.addAll(members);
            rSet.expire(Duration.ofSeconds(groupMembersTtlSeconds));

            log.debug("Cached group members to Redis: groupId={}, memberCount={}",
                    groupId, members.size());
        } catch (Exception e) {
            log.error("Failed to cache group members to Redis: groupId={}", groupId, e);
        }
    }

    /**
     * 添加群成员
     */
    public void addGroupMember(Long groupId, Long userId) {
        try {
            String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
            RSet<Long> rSet = redissonClient.getSet(key);

            if (rSet.isExists()) {
                rSet.add(userId);
                rSet.expire(Duration.ofSeconds(groupMembersTtlSeconds));
                log.debug("Added group member to Redis: groupId={}, userId={}", groupId, userId);
            }
        } catch (Exception e) {
            log.error("Failed to add group member to Redis: groupId={}, userId={}", groupId, userId, e);
        }
    }

    /**
     * 移除群成员
     */
    public void removeGroupMember(Long groupId, Long userId) {
        try {
            String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
            RSet<Long> rSet = redissonClient.getSet(key);

            if (rSet.isExists()) {
                rSet.remove(userId);
                log.debug("Removed group member from Redis: groupId={}, userId={}", groupId, userId);
            }
        } catch (Exception e) {
            log.error("Failed to remove group member from Redis: groupId={}, userId={}", groupId, userId, e);
        }
    }

    /**
     * 删除群成员缓存
     */
    public void deleteGroupMembers(Long groupId) {
        try {
            String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
            redissonClient.getBucket(key).delete();
            log.debug("Deleted group members cache from Redis: groupId={}", groupId);
        } catch (Exception e) {
            log.error("Failed to delete group members cache from Redis: groupId={}", groupId, e);
        }
    }

    /**
     * 获取好友关系
     */
    public Boolean getFriendRelation(Long userId1, Long userId2) {
        try {
            String key = buildFriendRelationKey(userId1, userId2);
            RBucket<Boolean> bucket = redissonClient.getBucket(key);

            if (bucket.isExists()) {
                Boolean isFriend = bucket.get();
                log.debug("Retrieved friend relation from Redis: key={}, isFriend={}", key, isFriend);
                return isFriend;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get friend relation from Redis: userId1={}, userId2={}", userId1, userId2, e);
            return null;
        }
    }

    /**
     * 缓存好友关系
     */
    public void putFriendRelation(Long userId1, Long userId2, Boolean isFriend) {
        try {
            String key = buildFriendRelationKey(userId1, userId2);
            RBucket<Boolean> bucket = redissonClient.getBucket(key);

            bucket.set(isFriend, Duration.ofSeconds(friendRelationTtlSeconds));
            log.debug("Cached friend relation to Redis: key={}, isFriend={}", key, isFriend);
        } catch (Exception e) {
            log.error("Failed to cache friend relation to Redis: userId1={}, userId2={}", userId1, userId2, e);
        }
    }

    /**
     * 删除好友关系缓存
     */
    public void deleteFriendRelation(Long userId1, Long userId2) {
        try {
            String key = buildFriendRelationKey(userId1, userId2);
            redissonClient.getBucket(key).delete();
            log.debug("Deleted friend relation cache from Redis: key={}", key);
        } catch (Exception e) {
            log.error("Failed to delete friend relation cache from Redis: userId1={}, userId2={}", userId1, userId2, e);
        }
    }

    private String buildFriendRelationKey(Long userId1, Long userId2) {
        // 确保Key的一致性，小的userId在前
        Long minUserId = Math.min(userId1, userId2);
        Long maxUserId = Math.max(userId1, userId2);
        return FRIEND_RELATION_KEY_PREFIX + minUserId + "_" + maxUserId;
    }


    /**
     * 获取群全局禁言信息
     */
    public MuteInfo getGroupMuteInfo(Long groupId) {
        try {
            String key = GROUP_MUTE_KEY_PREFIX + groupId;
            RBucket<MuteInfo> bucket = redissonClient.getBucket(key);

            if (bucket.isExists()) {
                MuteInfo muteInfo = bucket.get();
                log.debug("Retrieved group mute info from Redis: groupId={}, muteType={}",
                        groupId, muteInfo.getMuteType());
                return muteInfo;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get group mute info from Redis: groupId={}", groupId, e);
            return null;
        }
    }

    /**
     * 获取用户禁言信息
     */
    public MuteInfo getUserMuteInfo(Long userId, Long groupId) {
        try {
            String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
            RBucket<MuteInfo> bucket = redissonClient.getBucket(key);

            if (bucket.isExists()) {
                MuteInfo muteInfo = bucket.get();
                log.debug("Retrieved user mute info from Redis: userId={}, groupId={}, muteType={}",
                        userId, groupId, muteInfo.getMuteType());
                return muteInfo;
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get user mute info from Redis: userId={}, groupId={}", userId, groupId, e);
            return null;
        }
    }

    /**
     * 缓存群全局禁言信息
     */
    public void putGroupMuteInfo(Long groupId, MuteInfo muteInfo) {
        try {
            String key = GROUP_MUTE_KEY_PREFIX + groupId;
            RBucket<MuteInfo> bucket = redissonClient.getBucket(key);

            // 根据禁言类型设置不同的TTL
            long ttl = calculateMuteTtl(muteInfo);
            bucket.set(muteInfo, Duration.ofSeconds(ttl));

            log.debug("Cached group mute info to Redis: groupId={}, muteType={}, ttl={}s",
                    groupId, muteInfo.getMuteType(), ttl);
        } catch (Exception e) {
            log.error("Failed to cache group mute info to Redis: groupId={}", groupId, e);
        }
    }

    /**
     * 缓存用户禁言信息
     */
    public void putUserMuteInfo(Long userId, Long groupId, MuteInfo muteInfo) {
        try {
            String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
            RBucket<MuteInfo> bucket = redissonClient.getBucket(key);

            // 根据禁言类型设置不同的TTL
            long ttl = calculateMuteTtl(muteInfo);
            bucket.set(muteInfo, Duration.ofSeconds(ttl));

            log.debug("Cached user mute info to Redis: userId={}, groupId={}, muteType={}, ttl={}s",
                    userId, groupId, muteInfo.getMuteType(), ttl);
        } catch (Exception e) {
            log.error("Failed to cache user mute info to Redis: userId={}, groupId={}", userId, groupId, e);
        }
    }

    /**
     * 删除群全局禁言信息缓存
     */
    public void deleteGroupMuteInfo(Long groupId) {
        try {
            String key = GROUP_MUTE_KEY_PREFIX + groupId;
            redissonClient.getBucket(key).delete();
            log.debug("Deleted group mute info cache from Redis: groupId={}", groupId);
        } catch (Exception e) {
            log.error("Failed to delete group mute info cache from Redis: groupId={}", groupId, e);
        }
    }

    /**
     * 删除用户禁言信息缓存
     */
    public void deleteUserMuteInfo(Long userId, Long groupId) {
        try {
            String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
            redissonClient.getBucket(key).delete();
            log.debug("Deleted user mute info cache from Redis: userId={}, groupId={}", userId, groupId);
        } catch (Exception e) {
            log.error("Failed to delete user mute info cache from Redis: userId={}, groupId={}", userId, groupId, e);
        }
    }

    /**
     * 根据禁言信息计算TTL
     */
    private long calculateMuteTtl(MuteInfo muteInfo) {
        switch (muteInfo.getMuteType()) {
            case TEMPORARY:
                // 临时禁言：使用禁言结束时间
                if (muteInfo.getMuteEndTime() != null) {
                    long remainingTime = (muteInfo.getMuteEndTime() - System.currentTimeMillis()) / 1000;
                    return Math.max(remainingTime, 60); // 最少缓存1分钟
                }
                break;
            case PERMANENT:
            case GROUP_ALL:
                // 永久禁言和全群禁言：使用较长的TTL
                return muteInfoTtlSeconds * 24; // 24小时
            case NONE:
            default:
                break;
        }
        return muteInfoTtlSeconds;
    }

    /**
     * 批量删除缓存（支持模式匹配）
     */
    public void deleteByPattern(String pattern) {
        try {
            redissonClient.getKeys().deleteByPattern(REDIS_KEY_PREFIX + pattern);
            log.debug("Deleted cache by pattern: {}", pattern);
        } catch (Exception e) {
            log.error("Failed to delete cache by pattern: {}", pattern, e);
        }
    }

    /**
     * 清空所有缓存
     */
    public void clearAllCaches() {
        try {
            deleteByPattern("*");
            log.info("All distributed caches cleared");
        } catch (Exception e) {
            log.error("Failed to clear all distributed caches", e);
        }
    }
}
