package org.com.store.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDedupDO {

    private String clientMessageId;
    private Long msgId;
    private Long sessionId;
    private Integer partitionId;
    private Long seq;
    private LocalDateTime createdAt;
}
