package org.com.auth.domain.user;

import lombok.Value;

import java.util.regex.Pattern;

/**
 * 邮箱值对象
 * 封装邮箱格式验证和业务规则
 */
@Value
public class Email {
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    String value;

    private Email(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("邮箱不能为空");
        }
        String trimmed = value.trim().toLowerCase();
        if (trimmed.length() > 50) {
            throw new IllegalArgumentException("邮箱长度不能超过50个字符");
        }
        if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("邮箱格式不正确: " + value);
        }
        this.value = trimmed;
    }

    /**
     * 工厂方法：创建邮箱
     */
    public static Email of(String value) {
        return new Email(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
