package org.com.store.infrastructure.persistence.po;

import lombok.Data;

@Data
public class UserMessageIndexDO {

    private Long userId;
    private Long sessionId;
    private Long msgId;
    private Long seq;
    private Integer readState;
}
