package org.com.social.infrastructure.persistence.po;

import lombok.Data;

@Data
public class UserProfileDO {
    private Long userId;
    private String imId;
    private String nickName;
    private String avatar;
    private Integer sex;
    private String personalSignature;
    private String areaName;
    private String areaCode;
    private Integer avatarVersion;
    private Integer nicknameVersion;
}
