package org.com.social.application;

import lombok.RequiredArgsConstructor;
import org.com.social.infrastructure.persistence.mapper.GroupPartitionMapper;
import org.com.social.infrastructure.persistence.mapper.ImGroupMapper;
import org.com.social.infrastructure.persistence.mapper.ImSessionMapper;
import org.com.social.infrastructure.persistence.mapper.SessionMemberMapper;
import org.com.social.infrastructure.persistence.po.ImGroupDO;
import org.com.social.infrastructure.persistence.po.ImSessionDO;
import org.com.social.infrastructure.persistence.po.SessionMemberDO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionApplicationService {

    private final ImSessionMapper imSessionMapper;
    private final SessionMemberMapper sessionMemberMapper;
    private final ImGroupMapper imGroupMapper;
    private final GroupPartitionMapper groupPartitionMapper;

    public ImSessionDO getSession(long sessionId) {
        return imSessionMapper.selectById(sessionId);
    }

    public List<SessionMemberDO> listSessionMembers(long sessionId) {
        return sessionMemberMapper.selectBySessionId(sessionId);
    }

    public CheckResult checkSendPermission(long sessionId, long userId, int partitionId) {
        ImSessionDO session = imSessionMapper.selectById(sessionId);
        if (session == null) {
            return CheckResult.deny("session_not_found", 0L);
        }

        long messageFlags = session.getMessageFlags() == null ? 0L : session.getMessageFlags();

        if (session.getState() != null && session.getState() != 1) {
            return CheckResult.deny("session_not_active", messageFlags);
        }

        SessionMemberDO member = sessionMemberMapper.selectOne(sessionId, userId);
        if (member == null) {
            return CheckResult.deny("not_a_session_member", messageFlags);
        }

        if (member.getIsActive() != null && member.getIsActive() != 1) {
            return CheckResult.deny("member_not_active", messageFlags);
        }

        if (session.getSessionType() != null && session.getSessionType() == 2) {
            if (partitionId != 1) {
                return CheckResult.deny("partition_not_supported", messageFlags);
            }

            ImGroupDO group = imGroupMapper.selectBySessionId(sessionId);
            if (group == null) {
                return CheckResult.deny("group_not_found", messageFlags);
            }
            if (group.getState() != null && group.getState() != 1) {
                return CheckResult.deny("group_not_active", messageFlags);
            }

            boolean partitionOk = groupPartitionMapper.exists(group.getGroupId(), partitionId);
            if (!partitionOk) {
                return CheckResult.deny("partition_not_found", messageFlags);
            }
        }

        return CheckResult.allow(messageFlags);
    }

    public record CheckResult(boolean allowed, String reason, long messageFlags) {
        public static CheckResult allow(long messageFlags) {
            return new CheckResult(true, "", messageFlags);
        }

        public static CheckResult deny(String reason, long messageFlags) {
            return new CheckResult(false, reason, messageFlags);
        }
    }
}
