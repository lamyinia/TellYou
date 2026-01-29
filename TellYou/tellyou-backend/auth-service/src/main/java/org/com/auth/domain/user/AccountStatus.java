package org.com.auth.domain.user;

/**
 * 账号状态枚举
 * 1-正常, 0-封禁
 */
public enum AccountStatus {
    /**
     * 正常状态
     */
    ACTIVE(1),

    /**
     * 封禁状态
     */
    BANNED(0);

    private final int code;

    AccountStatus(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    /**
     * 从数据库代码转换为枚举
     */
    public static AccountStatus fromCode(int code) {
        for (AccountStatus status : values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("未知的账号状态代码: " + code);
    }

    /**
     * 判断账号是否可用
     */
    public boolean isActive() {
        return this == ACTIVE;
    }
}
