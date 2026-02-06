package org.com.store.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OutboxEventDO {

    private Long id;
    private String eventType;
    private String topic;
    private String keys;
    private String body;
    private Integer status;
    private Integer retryCount;
    private LocalDateTime nextRetryAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
