package org.com.store.application;

import com.alibaba.fastjson2.JSON;
import lombok.RequiredArgsConstructor;
import org.com.shared.proto.social.session.v1.CheckSendPermissionResponse;
import org.com.shared.infrastructure.id.SnowflakeIdGenerator;
import org.com.store.domain.MessageFlags;
import org.com.store.infrastructure.grpc.SocialSessionGrpcClient;
import org.com.store.infrastructure.outbox.OutboxEventFactory;
import org.com.store.infrastructure.persistence.mapper.MessageFanoutTaskMapper;
import org.com.store.infrastructure.persistence.mapper.MessageDedupMapper;
import org.com.store.infrastructure.persistence.mapper.MessageMapper;
import org.com.store.infrastructure.persistence.mapper.OutboxEventMapper;
import org.com.store.infrastructure.persistence.mapper.UserMessageIndexMapper;
import org.com.store.infrastructure.persistence.po.MessageDO;
import org.com.store.infrastructure.persistence.po.MessageDedupDO;
import org.com.store.infrastructure.persistence.po.MessageFanoutTaskDO;
import org.com.store.infrastructure.persistence.po.OutboxEventDO;
import org.com.store.infrastructure.persistence.po.UserMessageIndexDO;
import org.com.store.infrastructure.seq.SeqGenerator;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MessageStoreApplicationService {

    private final SnowflakeIdGenerator idGenerator;
    private final SeqGenerator seqGenerator;

    private final MessageMapper messageMapper;
    private final MessageDedupMapper messageDedupMapper;
    private final OutboxEventMapper outboxEventMapper;
    private final OutboxEventFactory outboxEventFactory;

    private final SocialSessionGrpcClient socialSessionGrpcClient;
    private final UserMessageIndexMapper userMessageIndexMapper;
    private final MessageFanoutTaskMapper messageFanoutTaskMapper;

    @Transactional
    public PersistResult persistChatMessage(PersistCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");
        if (cmd.senderId() <= 0) {
            return PersistResult.failed("invalid_sender_id");
        }
        if (cmd.sessionId() <= 0) {
            return PersistResult.failed("invalid_session_id");
        }
        if (cmd.clientMessageId() == null || cmd.clientMessageId().isBlank()) {
            return PersistResult.failed("missing_client_message_id");
        }
        if (cmd.content() == null || cmd.content().isBlank()) {
            return PersistResult.failed("missing_content");
        }

        int partitionId = cmd.partitionId() <= 0 ? 1 : cmd.partitionId();

        long messageFlags;
        try {
            CheckSendPermissionResponse perm = socialSessionGrpcClient.checkSendPermission(cmd.sessionId(), cmd.senderId(), partitionId);
            if (!perm.getAllowed()) {
                return PersistResult.failed(perm.getReason() == null || perm.getReason().isBlank() ? "send_not_allowed" : perm.getReason());
            }
            messageFlags = perm.getMessageFlags();
        } catch (Exception e) {
            return PersistResult.failed("permission_check_failed");
        }

        try {
            JSON.parse(cmd.content());
        } catch (Exception e) {
            return PersistResult.failed("invalid_content_json");
        }
        long nowMs = System.currentTimeMillis();

        long msgId = idGenerator.nextId();
        long seq = seqGenerator.nextSeq(cmd.sessionId());

        MessageDedupDO dedup = new MessageDedupDO();
        dedup.setClientMessageId(cmd.clientMessageId());
        dedup.setMsgId(msgId);
        dedup.setSessionId(cmd.sessionId());
        dedup.setPartitionId(partitionId);
        dedup.setSeq(seq);
        dedup.setCreatedAt(LocalDateTime.now());

        try {
            messageDedupMapper.insert(dedup);
        } catch (DuplicateKeyException dup) {
            MessageDedupDO existing = messageDedupMapper.selectByClientMessageId(cmd.clientMessageId());
            if (existing == null) {
                return PersistResult.failed("duplicate_but_missing_record");
            }
            return PersistResult.persisted(
                    existing.getMsgId(),
                    existing.getSeq(),
                    existing.getPartitionId(),
                    cmd.appearance(),
                    nowMs
            );
        }

        MessageDO message = new MessageDO();
        message.setMsgId(msgId);
        message.setSessionId(cmd.sessionId());
        message.setSenderId(cmd.senderId());
        message.setPartitionId(partitionId);
        message.setSeq(seq);
        message.setMsgType(cmd.type());
        message.setAppearance(cmd.appearance());
        message.setContent(cmd.content());
        message.setCreatedAt(LocalDateTime.now());

        messageMapper.insert(message);

        OutboxEventDO outbox = outboxEventFactory.createMessagePersistedEvent(message, cmd.clientMessageId(), cmd.clientTimeMs(), nowMs, cmd.traceId());
        outboxEventMapper.insert(outbox);

        boolean writeFanout = MessageFlags.has(messageFlags, MessageFlags.WRITE_FANOUT);
        if (writeFanout) {
            boolean asyncFanout = MessageFlags.has(messageFlags, MessageFlags.ASYNC_FANOUT);
            if (asyncFanout) {
                MessageFanoutTaskDO task = new MessageFanoutTaskDO();
                task.setSessionId(cmd.sessionId());
                task.setMsgId(msgId);
                task.setSeq(seq);
                task.setStatus(0);
                task.setRetryCount(0);
                task.setNextRetryAt(null);
                LocalDateTime now = LocalDateTime.now();
                task.setCreatedAt(now);
                task.setUpdatedAt(now);
                messageFanoutTaskMapper.insert(task);
            } else {
                var membersResp = socialSessionGrpcClient.listSessionMembers(cmd.sessionId());
                var members = membersResp.getMembersList();
                ArrayList<UserMessageIndexDO> items = new ArrayList<>(members.size());
                for (var m : members) {
                    if (!m.getIsActive()) {
                        continue;
                    }
                    UserMessageIndexDO idx = new UserMessageIndexDO();
                    idx.setUserId(m.getUserId());
                    idx.setSessionId(cmd.sessionId());
                    idx.setMsgId(msgId);
                    idx.setSeq(seq);
                    idx.setReadState(0);
                    items.add(idx);
                }
                if (!items.isEmpty()) {
                    userMessageIndexMapper.batchInsertIgnore(items);
                }
            }
        }

        return PersistResult.persisted(msgId, seq, partitionId, cmd.appearance(), nowMs);
    }

    public record PersistCommand(
            String clientMessageId,
            int type,
            long targetId,
            long sessionId,
            long senderId,
            String content,
            long clientTimeMs,
            int partitionId,
            Integer appearance,
            String traceId
    ) {
    }

    public record PersistResult(
            boolean persisted,
            long msgId,
            long seq,
            int partitionId,
            Integer appearance,
            long serverTimeMs,
            String reason
    ) {
        public static PersistResult persisted(long msgId, long seq, int partitionId, Integer appearance, long serverTimeMs) {
            return new PersistResult(true, msgId, seq, partitionId, appearance, serverTimeMs, "");
        }

        public static PersistResult failed(String reason) {
            return new PersistResult(false, 0L, 0L, 0, null, System.currentTimeMillis(), reason == null ? "" : reason);
        }
    }
}
