package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.contact.dao.mysql.FriendContactDao;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.contact.domain.entity.FriendContact;
import org.com.modules.group.dao.mysql.GroupInfoDao;
import org.com.modules.mail.cache.entity.MuteInfo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 统一缓存服务门面
 * 实现多级缓存查询链路：Caffeine -> Redisson -> MySQL
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyService {
    private final LocalCache localCache;
    private final DistributedCache distributedCache;
    private final GroupInfoDao groupInfoDao;
    private final GroupContactDao groupContactDao;
    private final FriendContactDao friendContactDao;


    /**
     * 获取群成员列表（多级缓存）
     * 查询链路：Caffeine -> Redisson -> MySQL
     */
    public Set<Long> getGroupMembers(Long groupId) {
        if (groupId == null) {
            return null;
        }
        try {
            Set<Long> members = localCache.getGroupMembers(groupId);
            if (members != null) {
                log.debug("Hit Caffeine cache for group members: groupId={}, memberCount={}",
                        groupId, members.size());
                return members;
            }

            members = distributedCache.getGroupMembers(groupId);
            if (members != null) {
                log.debug("Hit Redis cache for group members: groupId={}, memberCount={}",
                        groupId, members.size());
                localCache.putGroupMembers(groupId, members);
                return members;
            }

            List<Long> memberList = groupContactDao.selectMemberListById(groupId);
            if (memberList != null) {
                log.debug("Hit database for group members: groupId={}, memberCount={}",
                        groupId, memberList.size());
                distributedCache.putGroupMembers(groupId, memberList.stream().collect(Collectors.toSet()));
                localCache.putGroupMembers(groupId, memberList.stream().collect(Collectors.toSet()));
                return memberList.stream().collect(Collectors.toSet());
            }

            log.debug("Group members not found: groupId={}", groupId);
            return null;

        } catch (Exception e) {
            log.error("Failed to get group members: groupId={}", groupId, e);
            return null;
        }
    }

    /**
     * 添加群成员
     */
    public void addGroupMember(Long groupId, Long userId) {
        if (groupId == null || userId == null) {
            return;
        }
        try {
            distributedCache.addGroupMember(groupId, userId);
            localCache.invalidateGroupMembers(groupId);
            log.debug("Added group member: groupId={}, userId={}", groupId, userId);
        } catch (Exception e) {
            log.error("Failed to add group member: groupId={}, userId={}", groupId, userId, e);
        }
    }

    /**
     * 移除群成员
     */
    public void removeGroupMember(Long groupId, Long userId) {
        if (groupId == null || userId == null) {
            return;
        }
        try {
            distributedCache.removeGroupMember(groupId, userId);
            localCache.invalidateGroupMembers(groupId);

            log.debug("Removed group member: groupId={}, userId={}", groupId, userId);
        } catch (Exception e) {
            log.error("Failed to remove group member: groupId={}, userId={}", groupId, userId, e);
        }
    }

    /**
     * 清除群成员缓存
     */
    public void clearGroupMembers(Long groupId) {
        if (groupId == null) {
            return;
        }
        try {
            distributedCache.deleteGroupMembers(groupId);
            localCache.invalidateGroupMembers(groupId);
            log.debug("Cleared group members cache: groupId={}", groupId);
        } catch (Exception e) {
            log.error("Failed to clear group members cache: groupId={}", groupId, e);
        }
    }

    /**
     * 检查好友关系（多级缓存）
     */
    public Boolean isFriend(Long userId1, Long userId2) {
        if (userId1 == null || userId2 == null) {
            return null;
        }

        try {
            Boolean isFriend = localCache.getFriendRelation(userId1, userId2);
            if (isFriend != null) {
                log.debug("Hit Caffeine cache for friend relation: userId1={}, userId2={}, isFriend={}",
                        userId1, userId2, isFriend);
                return isFriend;
            }

            isFriend = distributedCache.getFriendRelation(userId1, userId2);
            if (isFriend != null) {
                log.debug("Hit Redis cache for friend relation: userId1={}, userId2={}, isFriend={}",
                        userId1, userId2, isFriend);

                localCache.putFriendRelation(userId1, userId2, isFriend);
                return isFriend;
            }
            
            FriendContact friendContact = friendContactDao.findByBothId(userId1, userId2);
            isFriend = friendContact != null && friendContact.getStatus() == 1;
            log.debug("Hit database for friend relation: userId1={}, userId2={}, isFriend={}",
                    userId1, userId2, isFriend);  
            distributedCache.putFriendRelation(userId1, userId2, isFriend);
            localCache.putFriendRelation(userId1, userId2, isFriend);          
            return isFriend;
        } catch (Exception e) {
            log.error("Failed to check friend relation: userId1={}, userId2={}", userId1, userId2, e);
            return null;
        }
    }

    /**
     * 缓存好友关系
     */
    public void putFriendRelation(Long userId1, Long userId2, Boolean isFriend) {
        if (userId1 == null || userId2 == null || isFriend == null) {
            return;
        }

        try {
            // 同时写入两级缓存
            distributedCache.putFriendRelation(userId1, userId2, isFriend);
            localCache.putFriendRelation(userId1, userId2, isFriend);

            log.debug("Cached friend relation to both levels: userId1={}, userId2={}, isFriend={}",
                    userId1, userId2, isFriend);
        } catch (Exception e) {
            log.error("Failed to cache friend relation: userId1={}, userId2={}", userId1, userId2, e);
        }
    }

    /**
     * 清除好友关系缓存
     */
    public void clearFriendRelation(Long userId1, Long userId2) {
        if (userId1 == null || userId2 == null) {
            return;
        }

        try {
            distributedCache.deleteFriendRelation(userId1, userId2);
            localCache.invalidateFriendRelation(userId1, userId2);

            log.debug("Cleared friend relation cache: userId1={}, userId2={}", userId1, userId2);
        } catch (Exception e) {
            log.error("Failed to clear friend relation cache: userId1={}, userId2={}", userId1, userId2, e);
        }
    }

    /**
     * 检查用户是否被禁言（多级缓存）
     * 先检查群全局禁言，再检查个人禁言
     */
    public boolean isUserMuted(Long userId, Long groupId) {
        if (userId == null || groupId == null) {
            return false;
        }

        try {
            // 1. 检查群全局禁言
            MuteInfo groupMute = getGroupMuteInfo(groupId);
            if (groupMute != null && groupMute.isActive()) {
                log.debug("User muted by group global mute: userId={}, groupId={}", userId, groupId);
                return true;
            }

            // 2. 检查个人禁言
            MuteInfo userMute = getUserMuteInfo(userId, groupId);
            if (userMute != null && userMute.isActive()) {
                log.debug("User muted by individual mute: userId={}, groupId={}", userId, groupId);
                return true;
            }

            return false;

        } catch (Exception e) {
            log.error("Failed to check user mute status: userId={}, groupId={}", userId, groupId, e);
            // 出错时默认不禁言，避免影响正常功能
            return false;
        }
    }

    /**
     * 获取群全局禁言信息（多级缓存）
     */
    public MuteInfo getGroupMuteInfo(Long groupId) {
        if (groupId == null) {
            return null;
        }

        try {
            // 1. 先查询Caffeine本地缓存
            MuteInfo muteInfo = localCache.getGroupMuteInfo(groupId);
            if (muteInfo != null) {
                log.debug("Hit Caffeine cache for group mute info: groupId={}, muteType={}",
                        groupId, muteInfo.getMuteType());
                return muteInfo;
            }

            // 2. 查询Redisson分布式缓存
            muteInfo = distributedCache.getGroupMuteInfo(groupId);
            if (muteInfo != null) {
                log.debug("Hit Redis cache for group mute info: groupId={}, muteType={}",
                        groupId, muteInfo.getMuteType());

                // 回写到Caffeine缓存
                localCache.putGroupMuteInfo(groupId, muteInfo);
                return muteInfo;
            }

            // 3. 查询数据库
            // muteInfo = groupService.getGroupMuteInfo(groupId);
            // if (muteInfo != null) {
            //     log.debug("Hit database for group mute info: groupId={}, muteType={}",
            //             groupId, muteInfo.getMuteType());
            //
            //     // 回写到两级缓存
            //     distributedCache.putGroupMuteInfo(groupId, muteInfo);
            //     verifyCache.putGroupMuteInfo(groupId, muteInfo);
            //     return muteInfo;
            // }

            return null;

        } catch (Exception e) {
            log.error("Failed to get group mute info: groupId={}", groupId, e);
            return null;
        }
    }

    /**
     * 获取用户禁言信息（多级缓存）
     */
    public MuteInfo getUserMuteInfo(Long userId, Long groupId) {
        if (userId == null || groupId == null) {
            return null;
        }

        try {
            // 1. 先查询Caffeine本地缓存
            MuteInfo muteInfo = localCache.getUserMuteInfo(userId, groupId);
            if (muteInfo != null) {
                log.debug("Hit Caffeine cache for user mute info: userId={}, groupId={}, muteType={}",
                        userId, groupId, muteInfo.getMuteType());
                return muteInfo;
            }

            // 2. 查询Redisson分布式缓存
            muteInfo = distributedCache.getUserMuteInfo(userId, groupId);
            if (muteInfo != null) {
                log.debug("Hit Redis cache for user mute info: userId={}, groupId={}, muteType={}",
                        userId, groupId, muteInfo.getMuteType());

                // 回写到Caffeine缓存
                localCache.putUserMuteInfo(userId, groupId, muteInfo);
                return muteInfo;
            }

            // 3. 查询数据库
            // muteInfo = groupService.getUserMuteInfo(userId, groupId);
            // if (muteInfo != null) {
            //     log.debug("Hit database for user mute info: userId={}, groupId={}, muteType={}",
            //             userId, groupId, muteInfo.getMuteType());
            //
            //     // 回写到两级缓存
            //     distributedCache.putUserMuteInfo(userId, groupId, muteInfo);
            //     verifyCache.putUserMuteInfo(userId, groupId, muteInfo);
            //     return muteInfo;
            // }

            return null;

        } catch (Exception e) {
            log.error("Failed to get user mute info: userId={}, groupId={}", userId, groupId, e);
            return null;
        }
    }

    /**
     * 缓存群全局禁言信息
     */
    public void putGroupMuteInfo(Long groupId, MuteInfo muteInfo) {
        if (groupId == null || muteInfo == null) {
            return;
        }

        try {
            // 同时写入两级缓存
            distributedCache.putGroupMuteInfo(groupId, muteInfo);
            localCache.putGroupMuteInfo(groupId, muteInfo);

            log.debug("Cached group mute info to both levels: groupId={}, muteType={}",
                    groupId, muteInfo.getMuteType());
        } catch (Exception e) {
            log.error("Failed to cache group mute info: groupId={}", groupId, e);
        }
    }

    /**
     * 缓存用户禁言信息
     */
    public void putUserMuteInfo(Long userId, Long groupId, MuteInfo muteInfo) {
        if (userId == null || groupId == null || muteInfo == null) {
            return;
        }

        try {
            // 同时写入两级缓存
            distributedCache.putUserMuteInfo(userId, groupId, muteInfo);
            localCache.putUserMuteInfo(userId, groupId, muteInfo);

            log.debug("Cached user mute info to both levels: userId={}, groupId={}, muteType={}",
                    userId, groupId, muteInfo.getMuteType());
        } catch (Exception e) {
            log.error("Failed to cache user mute info: userId={}, groupId={}", userId, groupId, e);
        }
    }

    /**
     * 清除群全局禁言信息缓存
     */
    public void clearGroupMuteInfo(Long groupId) {
        if (groupId == null) {
            return;
        }

        try {
            distributedCache.deleteGroupMuteInfo(groupId);
            localCache.invalidateGroupMuteInfo(groupId);

            log.debug("Cleared group mute info cache: groupId={}", groupId);
        } catch (Exception e) {
            log.error("Failed to clear group mute info cache: groupId={}", groupId, e);
        }
    }

    /**
     * 清除用户禁言信息缓存
     */
    public void clearUserMuteInfo(Long userId, Long groupId) {
        if (userId == null || groupId == null) {
            return;
        }

        try {
            distributedCache.deleteUserMuteInfo(userId, groupId);
            localCache.invalidateUserMuteInfo(userId, groupId);

            log.debug("Cleared user mute info cache: userId={}, groupId={}", userId, groupId);
        } catch (Exception e) {
            log.error("Failed to clear user mute info cache: userId={}, groupId={}", userId, groupId, e);
        }
    }

    /**
     * 清空所有缓存
     */
    public void clearAllCaches() {
        try {
            distributedCache.clearAllCaches();
            localCache.clearAllCaches();

            log.info("All caches cleared successfully");
        } catch (Exception e) {
            log.error("Failed to clear all caches", e);
        }
    }

    /**
     * 获取缓存统计信息
     */
    public void logCacheStats() {
        try {
            localCache.logCacheStats();
            log.info("Cache statistics logged");
        } catch (Exception e) {
            log.error("Failed to log cache statistics", e);
        }
    }
}
