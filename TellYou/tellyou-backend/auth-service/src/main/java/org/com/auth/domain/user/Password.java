package org.com.auth.domain.user;

import lombok.Value;

/**
 * 密码值对象
 * 封装密码的业务规则和验证逻辑
 * 注意：实际加密由基础设施层的PasswordEncoder负责
 */
@Value
public class Password {
    String hash; // 存储的是加密后的哈希值

    private Password(String hash) {
        if (hash == null || hash.isBlank()) {
            throw new IllegalArgumentException("密码哈希不能为空");
        }
        this.hash = hash;
    }

    /**
     * 工厂方法：创建密码（从已加密的哈希值）
     * 用于从数据库加载
     */
    public static Password fromHash(String hash) {
        return new Password(hash);
    }

    /**
     * 工厂方法：创建密码（从明文，需要加密）
     * 这个方法应该由基础设施层调用，传入加密后的哈希值
     */
    public static Password encrypted(String hash) {
        return new Password(hash);
    }

    /**
     * 验证密码是否匹配
     * 注意：实际验证逻辑由基础设施层的PasswordEncoder负责
     * 这里只提供接口，具体实现会调用PasswordEncoder
     */
    public boolean matches(String plainPassword, PasswordEncoder encoder) {
        return encoder.matches(plainPassword, this.hash);
    }

    /**
     * 密码编码器接口（由基础设施层实现）
     */
    public interface PasswordEncoder {
        /**
         * 加密明文密码
         */
        String encode(String plainPassword);

        /**
         * 验证明文密码是否匹配哈希值
         */
        boolean matches(String plainPassword, String hash);
    }

    @Override
    public String toString() {
        return "***"; // 安全考虑，不暴露哈希值
    }
}
