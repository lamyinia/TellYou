package org.com.social.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SessionMemberDO {
    private Long sessionId;
    private Long userId;
    private Integer role;
    private LocalDateTime joinTime;
    private LocalDateTime leaveTime;
    private Integer isActive;
    private Integer version;
}
