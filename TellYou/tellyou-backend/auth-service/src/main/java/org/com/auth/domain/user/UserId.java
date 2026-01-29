package org.com.auth.domain.user;

import lombok.Value;

/**
 * 用户ID值对象
 * 不可变的值对象，封装用户ID的业务规则
 */
@Value
public class UserId {
    Long value;

    private UserId(Long value) {
        if (value == null || value <= 0) {
            throw new IllegalArgumentException("用户ID必须大于0");
        }
        this.value = value;
    }

    /**
     * 工厂方法：创建用户ID
     */
    public static UserId of(Long value) {
        return new UserId(value);
    }

    /**
     * 工厂方法：从字符串创建
     */
    public static UserId fromString(String value) {
        try {
            return of(Long.parseLong(value));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("无效的用户ID格式: " + value);
        }
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
