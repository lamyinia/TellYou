package org.com.store.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.store.infrastructure.persistence.po.OutboxEventDO;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface OutboxEventMapper {

    void insert(OutboxEventDO outboxEventDO);

    List<OutboxEventDO> listPending(@Param("now") LocalDateTime now, @Param("limit") int limit);

    List<OutboxEventDO> lockPendingSkipLocked(@Param("now") LocalDateTime now, @Param("limit") int limit);

    int markProcessingBatch(@Param("ids") List<Long> ids, @Param("updatedAt") LocalDateTime updatedAt);

    int markProcessing(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);

    int markSent(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);

    int markRetry(
            @Param("id") long id,
            @Param("retryCount") int retryCount,
            @Param("nextRetryAt") LocalDateTime nextRetryAt,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    int markFailed(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);
}
