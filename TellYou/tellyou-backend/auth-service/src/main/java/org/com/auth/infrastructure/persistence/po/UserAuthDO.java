package org.com.auth.infrastructure.persistence.po;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 用户认证表 DO（Data Object）
 * 对应数据库表 user_auth
 */
@Data
public class UserAuthDO {
    /**
     * 用户ID
     */
    private Long userId;
    
    /**
     * 邮箱
     */
    private String email;
    
    /**
     * 密码哈希
     */
    private String passwordHash;
    
    /**
     * 账号状态 1正常 0封禁
     */
    private Integer accountStatus;
    
    /**
     * 创建时间
     */
    private LocalDateTime createTime;
}
