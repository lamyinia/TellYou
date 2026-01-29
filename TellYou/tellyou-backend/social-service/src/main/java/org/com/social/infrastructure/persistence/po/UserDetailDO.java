package org.com.social.infrastructure.persistence.po;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDetailDO {
    private Long userId;
    private LocalDateTime lastLoginTime;
    private String lastLoginIp;
    private Integer renameTimesLeft;
    private Integer imIdTimesLeft;
    private Integer avatarTimesLeft;
    private Integer signatureTimesLeft;
    private String extension;
}
