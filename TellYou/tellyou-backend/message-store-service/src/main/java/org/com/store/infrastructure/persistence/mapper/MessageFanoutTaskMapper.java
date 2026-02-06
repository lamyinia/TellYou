package org.com.store.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.store.infrastructure.persistence.po.MessageFanoutTaskDO;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface MessageFanoutTaskMapper {

    void insert(MessageFanoutTaskDO task);

    List<MessageFanoutTaskDO> listPending(@Param("now") LocalDateTime now, @Param("limit") int limit);

    int markProcessing(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);

    int markDone(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);

    int markRetry(
            @Param("id") long id,
            @Param("retryCount") int retryCount,
            @Param("nextRetryAt") LocalDateTime nextRetryAt,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    int markFailed(@Param("id") long id, @Param("updatedAt") LocalDateTime updatedAt);
}
