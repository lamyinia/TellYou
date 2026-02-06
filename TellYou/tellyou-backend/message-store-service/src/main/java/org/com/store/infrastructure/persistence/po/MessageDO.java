package org.com.store.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageDO {

    private Long msgId;
    private Long sessionId;
    private Long senderId;
    private Integer partitionId;
    private Long seq;
    private Integer msgType;
    private Integer appearance;
    private String content;
    private LocalDateTime createdAt;
}
