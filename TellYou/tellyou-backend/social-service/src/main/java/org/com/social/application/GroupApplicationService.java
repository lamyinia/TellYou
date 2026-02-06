package org.com.social.application;

import lombok.RequiredArgsConstructor;
import org.com.shared.infrastructure.id.SnowflakeIdGenerator;
import org.com.social.infrastructure.persistence.mapper.GroupPartitionMapper;
import org.com.social.infrastructure.persistence.mapper.GroupRelationMapper;
import org.com.social.infrastructure.persistence.mapper.ImGroupMapper;
import org.com.social.infrastructure.persistence.mapper.ImSessionMapper;
import org.com.social.infrastructure.persistence.mapper.SessionMemberMapper;
import org.com.social.infrastructure.persistence.po.GroupPartitionDO;
import org.com.social.infrastructure.persistence.po.GroupRelationDO;
import org.com.social.infrastructure.persistence.po.ImGroupDO;
import org.com.social.infrastructure.persistence.po.ImSessionDO;
import org.com.social.infrastructure.persistence.po.SessionMemberDO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupApplicationService {

    private static final int SESSION_TYPE_GROUP = 2;

    private static final int SESSION_STATE_ACTIVE = 1;

    private static final int GROUP_STATE_ACTIVE = 1;

    private static final int SESSION_MEMBER_ROLE_MEMBER = 1;

    private static final int SESSION_MEMBER_ROLE_OWNER = 3;

    private static final int DEFAULT_GROUP_JOIN_MODE = 1;

    private static final int DEFAULT_GROUP_SPEAK_MODE = 1;

    private static final int DEFAULT_MAX_MEMBERS = 300;

    private static final int DEFAULT_MAX_PARTITION_COUNT = 3;

    private static final int DEFAULT_PARTITION_ID = 1;

    private static final String DEFAULT_PARTITION_NAME = "聊天区";

    private static final String DEFAULT_GROUP_AVATAR = "toBeFilled";

    private static final String DEFAULT_GROUP_CARD = "欢迎加群";

    private static final String DEFAULT_GROUP_NOTIFICATION = "抵制不良风气，构建和谐交流氛围";

    private static final long MESSAGE_FLAG_WRITE_FANOUT = 1L;

    private static final long MESSAGE_FLAG_REDIS_SEQ = 8L;

    private static final long DEFAULT_MESSAGE_FLAGS = MESSAGE_FLAG_WRITE_FANOUT | MESSAGE_FLAG_REDIS_SEQ;

    private final SnowflakeIdGenerator snowflakeIdGenerator;

    private final ImSessionMapper imSessionMapper;

    private final ImGroupMapper imGroupMapper;

    private final SessionMemberMapper sessionMemberMapper;

    private final GroupRelationMapper groupRelationMapper;

    private final GroupPartitionMapper groupPartitionMapper;

    @Transactional
    public CreateGroupResult createGroup(long creatorId, String groupName, String avatar, Integer joinMode, List<Long> initialMemberIds) {
        long sessionId = snowflakeIdGenerator.nextId();
        long groupId = snowflakeIdGenerator.nextId();

        ImSessionDO session = new ImSessionDO();
        session.setSessionId(sessionId);
        session.setSessionType(SESSION_TYPE_GROUP);
        session.setState(SESSION_STATE_ACTIVE);
        session.setVersion(1);
        session.setMessageFlags(DEFAULT_MESSAGE_FLAGS);
        session.setExtJson(null);
        imSessionMapper.insert(session);

        ImGroupDO group = new ImGroupDO();
        group.setGroupId(groupId);
        group.setSessionId(sessionId);
        group.setOwnerId(creatorId);
        group.setCreatorId(creatorId);
        group.setGroupName(groupName);
        group.setAvatar(avatar == null || avatar.isBlank() ? DEFAULT_GROUP_AVATAR : avatar);
        group.setState(GROUP_STATE_ACTIVE);
        group.setJoinMode(joinMode == null ? DEFAULT_GROUP_JOIN_MODE : joinMode);
        group.setSpeakMode(DEFAULT_GROUP_SPEAK_MODE);
        group.setCard(DEFAULT_GROUP_CARD);
        group.setNotification(DEFAULT_GROUP_NOTIFICATION);
        group.setVersion(1);

        List<Long> memberIds = normalizeMemberIds(creatorId, initialMemberIds);
        group.setMemberCount(memberIds.size());
        group.setMaxMembers(DEFAULT_MAX_MEMBERS);
        group.setPartitionCount(1);
        group.setMaxPartitionCount(DEFAULT_MAX_PARTITION_COUNT);
        imGroupMapper.insert(group);

        GroupPartitionDO partition = new GroupPartitionDO();
        partition.setGroupId(groupId);
        partition.setPartitionId(DEFAULT_PARTITION_ID);
        partition.setPartitionName(DEFAULT_PARTITION_NAME);
        groupPartitionMapper.insert(partition);

        LocalDateTime now = LocalDateTime.now();
        List<SessionMemberDO> members = new ArrayList<>(memberIds.size());
        List<GroupRelationDO> relations = new ArrayList<>(memberIds.size());
        for (Long memberId : memberIds) {
            Integer role = memberId != null && memberId == creatorId ? SESSION_MEMBER_ROLE_OWNER : SESSION_MEMBER_ROLE_MEMBER;

            SessionMemberDO m = new SessionMemberDO();
            m.setSessionId(sessionId);
            m.setUserId(memberId);
            m.setRole(role);
            m.setJoinTime(now);
            m.setLeaveTime(null);
            m.setIsActive(1);
            m.setVersion(1);
            members.add(m);

            GroupRelationDO r = new GroupRelationDO();
            r.setGroupId(groupId);
            r.setUserId(memberId);
            r.setRole(role);
            r.setJoinTime(now);
            r.setLeaveTime(null);
            r.setContactVersion(1);
            r.setIsActive(1);
            r.setExtPower(null);
            relations.add(r);
        }
        if (!members.isEmpty()) {
            sessionMemberMapper.insertBatch(members);
        }

        if (!relations.isEmpty()) {
            groupRelationMapper.insertBatch(relations);
        }

        return new CreateGroupResult(groupId, sessionId);
    }

    private static List<Long> normalizeMemberIds(long creatorId, List<Long> initialMemberIds) {
        LinkedHashSet<Long> set = new LinkedHashSet<>();
        set.add(creatorId);
        if (initialMemberIds != null) {
            for (Long id : initialMemberIds) {
                if (id == null) {
                    continue;
                }
                set.add(id);
            }
        }
        return new ArrayList<>(set);
    }

    public record CreateGroupResult(long groupId, long sessionId) {
    }
}
