package org.com.auth.domain.user;

import lombok.Getter;
import java.time.LocalDateTime;

/**
 * 用户聚合根
 * 封装用户相关的所有业务逻辑和不变性约束
 */
@Getter
public class User {
    // 聚合根标识
    private final UserId id;
    private Email email;
    private Password password;
    private AccountStatus accountStatus;
    
    // 审计字段
    private final LocalDateTime createTime;
    private LocalDateTime updateTime;
    
    // 私有构造函数，强制使用工厂方法
    private User(UserId id, Email email, Password password, 
                 AccountStatus accountStatus, LocalDateTime createTime) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.accountStatus = accountStatus;
        this.createTime = createTime != null ? createTime : LocalDateTime.now();
        this.updateTime = this.createTime;
    }
    
    /**
     * 工厂方法：注册新用户
     */
    public static User register(UserId id, Email email, Password password) {
        if (id == null) {
            throw new IllegalArgumentException("用户ID不能为空");
        }
        if (email == null) {
            throw new IllegalArgumentException("邮箱不能为空");
        }
        if (password == null) {
            throw new IllegalArgumentException("密码不能为空");
        }

        return new User(id, email, password, AccountStatus.ACTIVE, LocalDateTime.now());
    }
    
    /**
     * 工厂方法：从持久化数据重建（用于仓储加载）
     */
    public static User reconstitute(UserId id, Email email, Password password,
                                   AccountStatus accountStatus, LocalDateTime createTime,
                                   LocalDateTime updateTime) {
        User user = new User(id, email, password, accountStatus, createTime);
        user.updateTime = updateTime;
        return user;
    }
    
    /**
     * 验证密码
     */
    public boolean verifyPassword(String plainPassword, Password.PasswordEncoder encoder) {
        if (!accountStatus.isActive()) {
            throw new IllegalStateException("账号已被封禁，无法登录");
        }
        return password.matches(plainPassword, encoder);
    }
    
    /**
     * 修改密码
     */
    public void changePassword(Password newPassword) {
        if (!accountStatus.isActive()) {
            throw new IllegalStateException("账号已被封禁，无法修改密码");
        }
        if (newPassword == null) {
            throw new IllegalArgumentException("新密码不能为空");
        }
        this.password = newPassword;
        this.updateTime = LocalDateTime.now();
    }
    
    /**
     * 封禁账号
     */
    public void ban() {
        if (this.accountStatus == AccountStatus.BANNED) {
            throw new IllegalStateException("账号已被封禁");
        }
        this.accountStatus = AccountStatus.BANNED;
        this.updateTime = LocalDateTime.now();
    }
    
    /**
     * 解封账号
     */
    public void unban() {
        if (this.accountStatus == AccountStatus.ACTIVE) {
            throw new IllegalStateException("账号状态正常");
        }
        this.accountStatus = AccountStatus.ACTIVE;
        this.updateTime = LocalDateTime.now();
    }
    
    /**
     * 检查账号是否可用
     */
    public boolean isActive() {
        return accountStatus.isActive();
    }
}
