package org.com.store.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageFanoutTaskDO {

    private Long id;
    private Long sessionId;
    private Long msgId;
    private Long seq;
    private Integer status;
    private Integer retryCount;
    private LocalDateTime nextRetryAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
