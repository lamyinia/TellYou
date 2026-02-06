
package org.com.social.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupRelationDO {
    private Long groupId;
    private Long userId;
    private Integer role;
    private LocalDateTime joinTime;
    private LocalDateTime leaveTime;
    private Integer contactVersion;
    private Integer isActive;
    private String extPower;
}
