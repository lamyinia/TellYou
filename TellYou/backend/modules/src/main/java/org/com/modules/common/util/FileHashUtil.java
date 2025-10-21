package org.com.modules.common.util;

import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 文件哈希生成工具类
 * 提供多种哈希生成策略，适用于不同场景
 *
 * @author lanye
 * @date 2025/10/22
 */
@Slf4j
public class FileHashUtil {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final char[] HEX_CHARS = "0123456789abcdef".toCharArray();

    /**
     * 哈希生成策略枚举
     */
    public enum HashStrategy {
        /**
         * 内容哈希：基于文件内容的SHA-256
         * 优点：相同内容生成相同哈希，支持去重
         * 缺点：需要读取文件内容，性能开销大
         */
        CONTENT_BASED,

        /**
         * 元数据哈希：基于文件元数据（大小、时间戳、用户ID）
         * 优点：性能好，不需要读取文件内容
         * 缺点：不同内容可能生成相同哈希（概率极低）
         */
        METADATA_BASED,

        /**
         * 随机哈希：基于时间戳和随机数
         * 优点：性能最好，保证唯一性
         * 缺点：无法去重，相同内容会生成不同哈希
         */
        RANDOM_BASED
    }

    /**
     * 生成文件哈希（推荐用于聊天文件）
     *
     * @param userId 用户ID
     * @param targetId 目标ID
     * @param fileSize 文件大小
     * @param fileName 原始文件名
     * @param strategy 哈希策略
     * @return 16位哈希字符串
     */
    public static String generateFileHash(Long userId, Long targetId, Long fileSize, String fileName, HashStrategy strategy) {
        return switch (strategy) {
            case CONTENT_BASED -> throw new UnsupportedOperationException("内容哈希需要文件流，请使用generateContentHash方法");
            case METADATA_BASED -> generateMetadataHash(userId, targetId, fileSize, fileName);
            case RANDOM_BASED -> generateRandomHash(userId, targetId);
        };
    }

    /**
     * 生成基于内容的哈希（适用于去重场景）
     *
     * @param inputStream 文件输入流
     * @return 16位哈希字符串
     */
    public static String generateContentHash(InputStream inputStream) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, bytesRead);
            }

            byte[] hashBytes = digest.digest();
            return bytesToHex(hashBytes).substring(0, 16); // 取前16位

        } catch (Exception e) {
            log.error("生成内容哈希失败", e);
            // 降级到随机哈希
            return generateRandomHash(null, null);
        }
    }

    /**
     * 生成基于元数据的哈希（推荐用于聊天文件）
     *
     * @param userId 用户ID
     * @param targetId 会话ID
     * @param fileSize 文件大小
     * @param fileName 原始文件名
     * @return 16位哈希字符串
     */
    private static String generateMetadataHash(Long userId, Long targetId, Long fileSize, String fileName) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            StringBuilder metadata = new StringBuilder();
            metadata.append(userId != null ? userId : 0);
            metadata.append("|");
            metadata.append(targetId != null ? targetId : "");
            metadata.append("|");
            metadata.append(fileSize != null ? fileSize : 0);
            metadata.append("|");
            metadata.append(fileName != null ? fileName : "");
            metadata.append("|");
            metadata.append(System.currentTimeMillis()); // 时间戳保证唯一性
            metadata.append("|");
            metadata.append(ThreadLocalRandom.current().nextInt(10000)); // 随机数防碰撞

            byte[] hashBytes = digest.digest(metadata.toString().getBytes());
            return bytesToHex(hashBytes).substring(0, 16);

        } catch (Exception e) {
            log.error("生成元数据哈希失败", e);
            return generateRandomHash(userId, targetId);
        }
    }

    /**
     * 生成随机哈希（最高性能）
     *
     * @param userId 用户ID（可选）
     * @param sessionId 会话ID（可选）
     * @return 16位哈希字符串
     */
    private static String generateRandomHash(Long userId, Long targetId) {
        StringBuilder hash = new StringBuilder(16);

        // 时间戳（毫秒）转16进制，取后8位
        String timeHex = Long.toHexString(System.currentTimeMillis());
        hash.append(timeHex.substring(Math.max(0, timeHex.length() - 8)));

        // 随机数填充到16位
        while (hash.length() < 16) {
            hash.append(HEX_CHARS[SECURE_RANDOM.nextInt(16)]);
        }

        return hash.toString();
    }

    /**
     * 字节数组转十六进制字符串
     */
    private static String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            result.append(HEX_CHARS[(b >> 4) & 0xF]);
            result.append(HEX_CHARS[b & 0xF]);
        }
        return result.toString();
    }

    /**
     * 验证哈希格式是否正确
     *
     * @param hash 哈希字符串
     * @return 是否为有效的16位十六进制字符串
     */
    public static boolean isValidHash(String hash) {
        return hash != null && hash.length() == 16 && hash.matches("[0-9a-f]{16}");
    }
}
