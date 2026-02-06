package org.com.pull.application;

import lombok.RequiredArgsConstructor;
import org.com.pull.infrastructure.grpc.SocialSessionGrpcClient;
import org.com.pull.infrastructure.persistence.mapper.MessageQueryMapper;
import org.com.pull.infrastructure.persistence.mapper.SessionReadOffsetMapper;
import org.com.pull.infrastructure.persistence.mapper.UserMessageIndexQueryMapper;
import org.com.pull.infrastructure.persistence.po.MessageDO;
import org.com.pull.infrastructure.persistence.po.SessionReadOffsetDO;
import org.com.pull.infrastructure.persistence.po.UserMessageIndexDO;
import org.com.shared.proto.message.pull.v1.*;
import org.com.shared.proto.social.common.v1.CursorPageRequest;
import org.com.shared.proto.social.session.v1.SessionMember;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MessagePullApplicationService {

    private final UserMessageIndexQueryMapper userMessageIndexQueryMapper;
    private final MessageQueryMapper messageQueryMapper;
    private final SessionReadOffsetMapper sessionReadOffsetMapper;
    private final SocialSessionGrpcClient socialSessionGrpcClient;

    public PullWriteFanoutOfflineByUserResponse pullWriteFanoutOfflineByUser(PullWriteFanoutOfflineByUserRequest request) {
        Objects.requireNonNull(request, "request");

        long userId = request.getUserId();
        if (userId <= 0) {
            return PullWriteFanoutOfflineByUserResponse.newBuilder().setCursor("").setIsLast(true).build();
        }

        CursorPageRequest page = request.hasPage() ? request.getPage() : CursorPageRequest.getDefaultInstance();
        int pageSize = page.getPageSize() <= 0 ? 100 : (int) page.getPageSize();
        if (pageSize > 200) {
            pageSize = 200;
        }

        long cursorId = CursorKey.parseCursorId(page.getCursor());

        List<UserMessageIndexDO> rows = userMessageIndexQueryMapper.listOfflineIndex(
                userId,
                cursorId,
                pageSize + 1
        );

        boolean isLast = rows == null || rows.size() <= pageSize;
        if (rows == null) {
            rows = List.of();
        }

        List<UserMessageIndexDO> pageRows = rows.size() > pageSize ? rows.subList(0, pageSize) : rows;

        List<Long> msgIds = new ArrayList<>(pageRows.size());
        for (UserMessageIndexDO r : pageRows) {
            if (r != null && r.getMsgId() != null) {
                msgIds.add(r.getMsgId());
            }
        }

        Map<Long, MessageDO> msgMap = new HashMap<>();
        if (!msgIds.isEmpty()) {
            List<MessageDO> messages = messageQueryMapper.listByMsgIds(msgIds);
            if (messages != null) {
                for (MessageDO m : messages) {
                    if (m != null && m.getMsgId() != null) {
                        msgMap.put(m.getMsgId(), m);
                    }
                }
            }
        }

        ArrayList<ChatMessage> out = new ArrayList<>(pageRows.size());
        for (UserMessageIndexDO r : pageRows) {
            if (r == null || r.getMsgId() == null || r.getSessionId() == null || r.getSeq() == null) {
                continue;
            }
            MessageDO m = msgMap.get(r.getMsgId());
            if (m == null) {
                continue;
            }

            out.add(toProto(m));
        }

        String nextCursor = "";
        if (!pageRows.isEmpty()) {
            UserMessageIndexDO last = pageRows.get(pageRows.size() - 1);
            if (last != null && last.getId() != null) {
                nextCursor = CursorKey.formatCursor(last.getId());
            }
        }

        return PullWriteFanoutOfflineByUserResponse.newBuilder()
                .setCursor(nextCursor)
                .setIsLast(isLast)
                .addAllMessages(out)
                .build();
    }

    public PullReadFanoutOfflineBySessionsResponse pullReadFanoutOfflineBySessions(PullReadFanoutOfflineBySessionsRequest request) {
        Objects.requireNonNull(request, "request");

        long userId = request.getUserId();
        if (userId <= 0) {
            return PullReadFanoutOfflineBySessionsResponse.newBuilder().build();
        }

        int limitPerSession = request.getLimitPerSession() <= 0 ? 100 : request.getLimitPerSession();
        if (limitPerSession > 200) {
            limitPerSession = 200;
        }

        ArrayList<SessionMessages> sessions = new ArrayList<>(request.getCursorsCount());
        for (SessionCursor c : request.getCursorsList()) {
            if (c == null) {
                continue;
            }
            long sessionId = c.getSessionId();
            long afterSeq = c.getAfterSeq();

            if (sessionId <= 0) {
                continue;
            }

            if (!isActiveMember(sessionId, userId)) {
                sessions.add(SessionMessages.newBuilder()
                        .setSessionId(sessionId)
                        .setNextAfterSeq(afterSeq)
                        .setHasMore(false)
                        .build());
                continue;
            }

            List<MessageDO> list = messageQueryMapper.listBySessionAfterSeq(sessionId, afterSeq, limitPerSession + 1);
            boolean hasMore = list != null && list.size() > limitPerSession;
            if (list == null) {
                list = List.of();
            }
            List<MessageDO> pageList = list.size() > limitPerSession ? list.subList(0, limitPerSession) : list;

            ArrayList<ChatMessage> msg = new ArrayList<>(pageList.size());
            long nextAfter = afterSeq;
            for (MessageDO m : pageList) {
                if (m == null || m.getSeq() == null) {
                    continue;
                }
                msg.add(toProto(m));
                nextAfter = Math.max(nextAfter, m.getSeq());
            }

            sessions.add(SessionMessages.newBuilder()
                    .setSessionId(sessionId)
                    .setNextAfterSeq(nextAfter)
                    .setHasMore(hasMore)
                    .addAllMessages(msg)
                    .build());
        }

        return PullReadFanoutOfflineBySessionsResponse.newBuilder()
                .addAllSessions(sessions)
                .build();
    }

    public AckReadProgressResponse ackReadProgress(AckReadProgressRequest request) {
        Objects.requireNonNull(request, "request");

        long userId = request.getUserId();
        long sessionId = request.getSessionId();
        long lastSeq = request.getLastSeq();

        if (userId <= 0 || sessionId <= 0 || lastSeq <= 0) {
            return AckReadProgressResponse.newBuilder().setUpdated(false).setServerLastSeq(0).build();
        }

        LocalDateTime now = LocalDateTime.now();

        int updated = sessionReadOffsetMapper.updateLastSeqIfGreater(sessionId, userId, lastSeq, now);
        int inserted = 0;
        if (updated == 0) {
            inserted = sessionReadOffsetMapper.insertIgnore(sessionId, userId, 0L, lastSeq, now);
            if (inserted == 0) {
                updated = sessionReadOffsetMapper.updateLastSeqIfGreater(sessionId, userId, lastSeq, now);
            }
        }

        Long serverLastSeq = sessionReadOffsetMapper.selectLastSeq(sessionId, userId);
        long serverSeq = serverLastSeq == null ? 0L : serverLastSeq;

        return AckReadProgressResponse.newBuilder()
                .setUpdated(updated > 0 || inserted > 0)
                .setServerLastSeq(serverSeq)
                .build();
    }

    public BatchGetSyncStateResponse batchGetSyncState(BatchGetSyncStateRequest request) {
        Objects.requireNonNull(request, "request");

        long userId = request.getUserId();
        if (userId <= 0 || request.getSessionIdsCount() == 0) {
            return BatchGetSyncStateResponse.newBuilder().build();
        }

        List<Long> sessionIds = request.getSessionIdsList();
        List<SessionReadOffsetDO> offsets = sessionReadOffsetMapper.batchSelectByUserAndSessions(userId, sessionIds);

        Map<Long, SessionReadOffsetDO> map = new HashMap<>();
        if (offsets != null) {
            for (SessionReadOffsetDO o : offsets) {
                if (o != null && o.getSessionId() != null) {
                    map.put(o.getSessionId(), o);
                }
            }
        }

        ArrayList<SessionSyncState> states = new ArrayList<>(sessionIds.size());
        for (Long sid : sessionIds) {
            if (sid == null || sid <= 0) {
                continue;
            }
            SessionReadOffsetDO o = map.get(sid);
            long lastSeq = o == null || o.getLastSeq() == null ? 0L : o.getLastSeq();
            long updatedAtMs = 0L;
            if (o != null && o.getUpdatedAt() != null) {
                updatedAtMs = o.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
            }

            states.add(SessionSyncState.newBuilder()
                    .setSessionId(sid)
                    .setLastSeq(lastSeq)
                    .setUpdatedAtMs(updatedAtMs)
                    .build());
        }

        return BatchGetSyncStateResponse.newBuilder()
                .addAllStates(states)
                .build();
    }

    private boolean isActiveMember(long sessionId, long userId) {
        var members = socialSessionGrpcClient.listSessionMembers(sessionId).getMembersList();
        if (members == null || members.isEmpty()) {
            return false;
        }
        for (SessionMember m : members) {
            if (m != null && m.getUserId() == userId && m.getIsActive()) {
                return true;
            }
        }
        return false;
    }

    private static ChatMessage toProto(MessageDO m) {
        long createdAtMs = 0L;
        if (m.getCreatedAt() != null) {
            createdAtMs = m.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        }

        return ChatMessage.newBuilder()
                .setSessionId(m.getSessionId() == null ? 0L : m.getSessionId())
                .setMsgId(m.getMsgId() == null ? "" : String.valueOf(m.getMsgId()))
                .setSeq(m.getSeq() == null ? 0L : m.getSeq())
                .setSenderId(m.getSenderId() == null ? 0L : m.getSenderId())
                .setPartitionId(m.getPartitionId() == null ? 0 : m.getPartitionId())
                .setMsgType(m.getMsgType() == null ? 0 : m.getMsgType())
                .setAppearance(m.getAppearance() == null ? 0 : m.getAppearance())
                .setContent(m.getContent() == null ? "" : m.getContent())
                .setCreatedAtMs(createdAtMs)
                .build();
    }

    private static final class CursorKey {

        private static long parseCursorId(String cursor) {
            if (cursor == null || cursor.isBlank()) {
                return 0L;
            }
            String c = cursor.trim();

            try {
                return Math.max(0L, Long.parseLong(c));
            } catch (Exception ignored) {
            }

            return 0L;
        }

        private static String formatCursor(long msgId) {
            return String.valueOf(msgId);
        }
    }
}
