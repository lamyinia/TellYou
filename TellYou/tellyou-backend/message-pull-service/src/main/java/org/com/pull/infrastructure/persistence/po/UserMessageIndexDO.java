package org.com.pull.infrastructure.persistence.po;

import lombok.Data;

@Data
public class UserMessageIndexDO {

    private Long id;
    private Long userId;
    private Long sessionId;
    private Long msgId;
    private Long seq;
    private Integer readState;
}
