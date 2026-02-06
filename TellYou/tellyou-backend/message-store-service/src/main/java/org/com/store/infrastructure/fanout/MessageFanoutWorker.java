package org.com.store.infrastructure.fanout;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.proto.social.session.v1.SessionMember;
import org.com.store.infrastructure.grpc.SocialSessionGrpcClient;
import org.com.store.infrastructure.persistence.mapper.MessageFanoutTaskMapper;
import org.com.store.infrastructure.persistence.mapper.UserMessageIndexMapper;
import org.com.store.infrastructure.persistence.po.MessageFanoutTaskDO;
import org.com.store.infrastructure.persistence.po.UserMessageIndexDO;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Component
@Slf4j
@RequiredArgsConstructor
public class MessageFanoutWorker {

    private final MessageFanoutTaskMapper taskMapper;
    private final SocialSessionGrpcClient socialSessionGrpcClient;
    private final UserMessageIndexMapper userMessageIndexMapper;
    @Qualifier("fanoutWorkerExecutor")
    private final Executor fanoutWorkerExecutor;

    @Value("${fanout.poll-interval-ms:500}")
    private long pollIntervalMs;

    @Value("${fanout.batch-size:50}")
    private int batchSize;

    @Value("${fanout.max-retry:10}")
    private int maxRetry;

    @Scheduled(fixedDelayString = "${fanout.poll-interval-ms:500}")
    public void runOnce() {
        LocalDateTime now = LocalDateTime.now();
        List<MessageFanoutTaskDO> tasks = taskMapper.listPending(now, batchSize);
        if (tasks == null || tasks.isEmpty()) {
            return;
        }

        ArrayList<CompletableFuture<Void>> futures = new ArrayList<>(tasks.size());
        for (MessageFanoutTaskDO t : tasks) {
            futures.add(CompletableFuture.runAsync(() -> processOne(t), fanoutWorkerExecutor));
        }
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }

    private void processOne(MessageFanoutTaskDO t) {
        if (t == null) {
            return;
        }
        long id = t.getId() == null ? 0L : t.getId();
        if (id <= 0) {
            return;
        }

        int claimed = taskMapper.markProcessing(id, LocalDateTime.now());
        if (claimed != 1) {
            return;
        }

        try {
            long sessionId = t.getSessionId() == null ? 0L : t.getSessionId();
            long msgId = t.getMsgId() == null ? 0L : t.getMsgId();
            long seq = t.getSeq() == null ? 0L : t.getSeq();
            if (sessionId <= 0 || msgId <= 0 || seq <= 0) {
                taskMapper.markFailed(id, LocalDateTime.now());
                return;
            }

            var membersResp = socialSessionGrpcClient.listSessionMembers(sessionId);
            List<SessionMember> members = membersResp.getMembersList();

            ArrayList<UserMessageIndexDO> items = new ArrayList<>(members.size());
            for (SessionMember m : members) {
                if (m == null || !m.getIsActive()) {
                    continue;
                }
                UserMessageIndexDO idx = new UserMessageIndexDO();
                idx.setUserId(m.getUserId());
                idx.setSessionId(sessionId);
                idx.setMsgId(msgId);
                idx.setSeq(seq);
                idx.setReadState(0);
                items.add(idx);
            }

            if (!items.isEmpty()) {
                userMessageIndexMapper.batchInsertIgnore(items);
            }

            taskMapper.markDone(id, LocalDateTime.now());
        } catch (Exception ex) {
            int nextRetryCount = (t.getRetryCount() == null ? 0 : t.getRetryCount()) + 1;
            if (nextRetryCount >= maxRetry) {
                taskMapper.markFailed(id, LocalDateTime.now());
                log.warn("fanout failed permanently: id={}, retries={}, err={}", id, nextRetryCount, ex.toString());
                return;
            }

            long backoffSeconds = Math.min(60, 1L << Math.min(6, nextRetryCount));
            LocalDateTime nextRetryAt = LocalDateTime.now().plusSeconds(backoffSeconds);
            taskMapper.markRetry(id, nextRetryCount, nextRetryAt, LocalDateTime.now());
            log.warn("fanout failed: id={}, retries={}, nextRetryAt={}, err={}", id, nextRetryCount, nextRetryAt, ex.toString());
        }
    }
}
