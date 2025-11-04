package org.com.modules.mail.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.contact.dao.mysql.FriendContactDao;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.contact.domain.entity.FriendContact;
import org.com.modules.group.dao.mysql.GroupInfoDao;
import org.com.modules.mail.cache.entity.GroupMemberInfo;
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
public class MultiLevelCacheService {
    private final LocalCache localCache;
    private final DistributedCache distributedCache;
    private final GroupInfoDao groupInfoDao;
    private final GroupContactDao groupContactDao;
    private final FriendContactDao friendContactDao;


    /**
     * 1)获取群成员列表（多级缓存）
     * 2)查询链路：Caffeine -> Redisson -> MYSQL
     * 3)在 MYSQL 查的数据需要双写缓存
     */
    public Set<Long> getGroupMembers(Long groupId) {
        if (groupId == null) {
            return null;
        }
        try {
            Set<GroupMemberInfo> members = localCache.getGroupMembers(groupId);
            if (members != null) {
                log.debug("groupMembers 命中本地缓存: groupId={}, memberCount={}", groupId, members.size());
                return members.stream().map(GroupMemberInfo::getUserId).collect(Collectors.toSet());
            }

            members = distributedCache.getGroupMembers(groupId);
            if (members != null) {
                log.debug("groupMembers 命中分布式缓存: groupId={}, memberCount={}", groupId, members.size());
                localCache.putGroupMembers(groupId, members);
                return members.stream().map(GroupMemberInfo::getUserId).collect(Collectors.toSet());
            }

            List<GroupMemberInfo> memberList = groupContactDao.selectMemberListById(groupId);
            if (memberList != null) {
                log.debug("groupMembers 命中数据库: groupId={}, memberCount={}",
                        groupId, memberList.size());
                distributedCache.putGroupMembers(groupId, memberList.stream().collect(Collectors.toSet()));
                localCache.putGroupMembers(groupId, memberList.stream().collect(Collectors.toSet()));
                return memberList.stream().map(GroupMemberInfo::getUserId).collect(Collectors.toSet());
            }

            log.debug("groupMembers 未找到: groupId={}", groupId);
            return null;

        } catch (Exception e) {
            log.error("groupMembers 获取失败: groupId={}", groupId, e);
            return null;
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
                log.debug("friendRelation 命中本地缓存: userId1={}, userId2={}, isFriend={}",
                        userId1, userId2, isFriend);
                return isFriend;
            }

            isFriend = distributedCache.getFriendRelation(userId1, userId2);
            if (isFriend != null) {
                log.debug("friendRelation 命中分布式缓存: userId1={}, userId2={}, isFriend={}",
                        userId1, userId2, isFriend);

                localCache.putFriendRelation(userId1, userId2, isFriend);
                return isFriend;
            }

            FriendContact friendContact = friendContactDao.findByBothId(userId1, userId2);
            isFriend = friendContact != null && friendContact.getStatus() == 1;
            log.debug("friendRelation 命中数据库: userId1={}, userId2={}, isFriend={}",
                    userId1, userId2, isFriend);
            distributedCache.putFriendRelation(userId1, userId2, isFriend);
            localCache.putFriendRelation(userId1, userId2, isFriend);
            return isFriend;
        } catch (Exception e) {
            log.error("friendRelation 获取失败: userId1={}, userId2={}", userId1, userId2, e);
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
}
