package org.com.store.infrastructure.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.client.producer.DefaultMQProducer;
import org.apache.rocketmq.client.producer.SendResult;
import org.apache.rocketmq.common.message.Message;
import org.com.store.infrastructure.persistence.mapper.OutboxEventMapper;
import org.com.store.infrastructure.persistence.po.OutboxEventDO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Component
@Slf4j
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxEventMapper outboxEventMapper;
    private final DefaultMQProducer producer;
    private final OutboxClaimService outboxClaimService;
    @Qualifier("outboxWorkerExecutor")
    private final Executor outboxWorkerExecutor;

    @Value("${outbox.batch-size:100}")
    private int batchSize;

    @Value("${outbox.max-retry:10}")
    private int maxRetry;

    @Scheduled(fixedDelayString = "${outbox.poll-interval-ms:500}")
    public void publishPending() {
        LocalDateTime now = LocalDateTime.now();
        List<OutboxEventDO> events = outboxClaimService.claim(now, batchSize);
        if (events == null || events.isEmpty()) {
            return;
        }

        ArrayList<CompletableFuture<Void>> futures = new ArrayList<>(events.size());
        for (OutboxEventDO e : events) {
            futures.add(CompletableFuture.runAsync(() -> publishOne(e), outboxWorkerExecutor));
        }
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }

    private void publishOne(OutboxEventDO e) {
        if (e == null) {
            return;
        }

        long id = e.getId() == null ? 0L : e.getId();
        if (id <= 0) {
            return;
        }

        try {
            Message msg = new Message(
                    e.getTopic(),
                    null,
                    e.getKeys(),
                    e.getBody() == null ? new byte[0] : e.getBody().getBytes(StandardCharsets.UTF_8)
            );

            SendResult result = producer.send(msg);
            outboxEventMapper.markSent(id, LocalDateTime.now());
            log.debug("outbox sent: id={}, topic={}, keys={}, result={}", id, e.getTopic(), e.getKeys(), result);
        } catch (Exception ex) {
            int nextRetryCount = (e.getRetryCount() == null ? 0 : e.getRetryCount()) + 1;
            if (nextRetryCount >= maxRetry) {
                outboxEventMapper.markFailed(id, LocalDateTime.now());
                log.warn("outbox failed permanently: id={}, retries={}, err={}", id, nextRetryCount, ex.toString());
                return;
            }

            long backoffSeconds = Math.min(60, 1L << Math.min(6, nextRetryCount));
            LocalDateTime nextRetryAt = LocalDateTime.now().plusSeconds(backoffSeconds);
            outboxEventMapper.markRetry(id, nextRetryCount, nextRetryAt, LocalDateTime.now());
            log.warn("outbox send failed: id={}, retries={}, nextRetryAt={}, err={}", id, nextRetryCount, nextRetryAt, ex.toString());
        }
    }
}
