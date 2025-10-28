package org.com.modules.mail.cache;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.RemovalListener;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.mail.cache.entity.MuteInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.time.Duration;
import java.util.Set;

/**
 * Caffeine本地缓存管理器
 * 负责高频访问数据的快速响应
 */
@Slf4j
@Component
public class LocalCache {
    @Value("${cache.caffeine.group-members.max-size:10000}")
    private long groupMembersMaxSize;

    @Value("${cache.caffeine.group-members.expire-after-access:120}")
    private long groupMembersExpireAfterAccessMinutes;

    @Value("${cache.caffeine.friend-relation.max-size:50000}")
    private long friendRelationMaxSize;

    @Value("${cache.caffeine.friend-relation.expire-after-write:360}")
    private long friendRelationExpireAfterWriteMinutes;

    @Value("${cache.caffeine.mute-info.max-size:20000}")
    private long muteInfoMaxSize;

    @Value("${cache.caffeine.mute-info.expire-after-write:60}")
    private long muteInfoExpireAfterWriteMinutes;

    private Cache<String, Set<Long>> groupMembersCache;
    private Cache<String, Boolean> friendRelationCache;
    private Cache<String, MuteInfo> muteInfoCache;

    public static final String GROUP_MEMBERS_KEY_PREFIX = "group:members:";
    public static final String FRIEND_RELATION_KEY_PREFIX = "friend:relation:";
    public static final String GROUP_MUTE_KEY_PREFIX = "mute:group:";
    public static final String USER_MUTE_KEY_PREFIX = "mute:user:";

    @PostConstruct
    public void initCaches() {
        log.info("Initializing Caffeine caches...");

        this.groupMembersCache = buildGroupMembersCache();
        this.friendRelationCache = buildFriendRelationCache();
        this.muteInfoCache = buildMuteInfoCache();

        log.info("Caffeine caches initialized successfully");
    }

    /**
     * 构建群成员缓存
     */
    private Cache<String, Set<Long>> buildGroupMembersCache() {
        return Caffeine.newBuilder()
                .maximumSize(groupMembersMaxSize)
                .expireAfterAccess(Duration.ofMinutes(groupMembersExpireAfterAccessMinutes))
                .removalListener((RemovalListener<String, Set<Long>>) (key, value, cause) -> {
                    log.debug("Group members cache removed: key={}, size={}, cause={}",
                            key, value != null ? value.size() : 0, cause);
                })
                .recordStats()
                .build();
    }

    /**
     * 构建好友关系缓存
     */
    private Cache<String, Boolean> buildFriendRelationCache() {
        return Caffeine.newBuilder()
                .maximumSize(friendRelationMaxSize)
                .expireAfterWrite(Duration.ofMinutes(friendRelationExpireAfterWriteMinutes))
                .removalListener((RemovalListener<String, Boolean>) (key, value, cause) -> {
                    log.debug("Friend relation cache removed: key={}, value={}, cause={}", key, value, cause);
                })
                .recordStats()
                .build();
    }

    /**
     * 构建禁言信息缓存
     */
    private Cache<String, MuteInfo> buildMuteInfoCache() {
        return Caffeine.newBuilder()
                .maximumSize(muteInfoMaxSize)
                .expireAfterWrite(Duration.ofMinutes(muteInfoExpireAfterWriteMinutes))
                .removalListener((RemovalListener<String, MuteInfo>) (key, value, cause) -> {
                    log.debug("Mute info cache removed: key={}, value={}, cause={}", key, value, cause);
                })
                .recordStats()
                .build();
    }


    public Set<Long> getGroupMembers(Long groupId) {
        String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
        return groupMembersCache.getIfPresent(key);
    }

    public void putGroupMembers(Long groupId, Set<Long> members) {
        String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
        groupMembersCache.put(key, members);
        log.debug("Cached group members: groupId={}, memberCount={}", groupId, members.size());
    }

    public void invalidateGroupMembers(Long groupId) {
        String key = GROUP_MEMBERS_KEY_PREFIX + groupId;
        groupMembersCache.invalidate(key);
        log.debug("Invalidated group members cache: groupId={}", groupId);
    }


    public Boolean getFriendRelation(Long userId1, Long userId2) {
        String key = buildFriendRelationKey(userId1, userId2);
        return friendRelationCache.getIfPresent(key);
    }

    public void putFriendRelation(Long userId1, Long userId2, Boolean isFriend) {
        String key = buildFriendRelationKey(userId1, userId2);
        friendRelationCache.put(key, isFriend);
        log.debug("Cached friend relation: key={}, isFriend={}", key, isFriend);
    }

    public void invalidateFriendRelation(Long userId1, Long userId2) {
        String key = buildFriendRelationKey(userId1, userId2);
        friendRelationCache.invalidate(key);
        log.debug("Invalidated friend relation cache: key={}", key);
    }

    private String buildFriendRelationKey(Long userId1, Long userId2) {
        Long minUserId = Math.min(userId1, userId2);
        Long maxUserId = Math.max(userId1, userId2);
        return FRIEND_RELATION_KEY_PREFIX + minUserId + "_" + maxUserId;
    }

    public MuteInfo getGroupMuteInfo(Long groupId) {
        String key = GROUP_MUTE_KEY_PREFIX + groupId;
        return muteInfoCache.getIfPresent(key);
    }

    public MuteInfo getUserMuteInfo(Long userId, Long groupId) {
        String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
        return muteInfoCache.getIfPresent(key);
    }

    public void putGroupMuteInfo(Long groupId, MuteInfo muteInfo) {
        String key = GROUP_MUTE_KEY_PREFIX + groupId;
        muteInfoCache.put(key, muteInfo);
        log.debug("Cached group mute info: groupId={}, muteType={}", groupId, muteInfo.getMuteType());
    }

    public void putUserMuteInfo(Long userId, Long groupId, MuteInfo muteInfo) {
        String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
        muteInfoCache.put(key, muteInfo);
        log.debug("Cached user mute info: userId={}, groupId={}, muteType={}",
                userId, groupId, muteInfo.getMuteType());
    }

    public void invalidateGroupMuteInfo(Long groupId) {
        String key = GROUP_MUTE_KEY_PREFIX + groupId;
        muteInfoCache.invalidate(key);
        log.debug("Invalidated group mute info cache: groupId={}", groupId);
    }

    public void invalidateUserMuteInfo(Long userId, Long groupId) {
        String key = USER_MUTE_KEY_PREFIX + userId + "_" + groupId;
        muteInfoCache.invalidate(key);
        log.debug("Invalidated user mute info cache: userId={}, groupId={}", userId, groupId);
    }

    public void logCacheStats() {
        log.info("=== Caffeine Cache Statistics ===");
        log.info("Group Members Cache: {}", groupMembersCache.stats());
        log.info("Friend Relation Cache: {}", friendRelationCache.stats());
        log.info("Mute Info Cache: {}", muteInfoCache.stats());
    }
    /**
     * 清空所有缓存
     */
    public void clearAllCaches() {
        groupMembersCache.invalidateAll();
        friendRelationCache.invalidateAll();
        muteInfoCache.invalidateAll();
        log.info("All Caffeine caches cleared");
    }
}
