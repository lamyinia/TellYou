package org.com.store.infrastructure.outbox;

import lombok.RequiredArgsConstructor;
import org.com.store.infrastructure.persistence.mapper.OutboxEventMapper;
import org.com.store.infrastructure.persistence.po.OutboxEventDO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OutboxClaimService {

    private final OutboxEventMapper outboxEventMapper;

    @Transactional
    public List<OutboxEventDO> claim(LocalDateTime now, int limit) {
        List<OutboxEventDO> events = outboxEventMapper.lockPendingSkipLocked(now, limit);
        if (events == null || events.isEmpty()) {
            return List.of();
        }

        ArrayList<Long> ids = new ArrayList<>(events.size());
        for (OutboxEventDO e : events) {
            if (e == null || e.getId() == null || e.getId() <= 0) {
                continue;
            }
            ids.add(e.getId());
        }
        if (ids.isEmpty()) {
            return List.of();
        }

        outboxEventMapper.markProcessingBatch(ids, LocalDateTime.now());
        return events;
    }
}
