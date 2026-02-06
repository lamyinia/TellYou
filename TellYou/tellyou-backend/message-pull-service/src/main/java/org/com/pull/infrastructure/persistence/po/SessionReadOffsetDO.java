package org.com.pull.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SessionReadOffsetDO {

    private Long sessionId;
    private Long userId;
    private Long lastMsgId;
    private Long lastSeq;
    private LocalDateTime updatedAt;
}
