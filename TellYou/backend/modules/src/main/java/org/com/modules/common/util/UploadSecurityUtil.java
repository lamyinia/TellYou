package org.com.modules.common.util;

import lombok.extern.slf4j.Slf4j;
import org.com.tools.exception.BusinessException;
import org.com.tools.template.MinioTemplate;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;

import java.util.Map;

/**
 * 上传安全验证工具类
 * 提供统一的文件上传安全验证机制，支持多种资源类型
 *
 * @author lanye
 * @date 2025/10/21
 */
@Slf4j
public class UploadSecurityUtil {

    /**
     * 资源类型枚举
     */
    public enum ResourceType {
        AVATAR("头像", 10 * 1024 * 1024, 0.1), // 10MB，10%容差
        PICTURE("图片", 50 * 1024 * 1024, 0.1), // 50MB，10%容差
        VIDEO("视频", 500 * 1024 * 1024, 0.15), // 500MB，15%容差
        VOICE("语音", 10 * 1024 * 1024, 0.1), // 10MB，10%容差
        FILE("文件", 100 * 1024 * 1024, 0.1); // 100MB，10%容差

        private final String displayName;
        private final long maxSize;
        private final double tolerance; // 容差比例

        ResourceType(String displayName, long maxSize, double tolerance) {
            this.displayName = displayName;
            this.maxSize = maxSize;
            this.tolerance = tolerance;
        }

        public String getDisplayName() { return displayName; }
        public long getMaxSize() { return maxSize; }
        public double getTolerance() { return tolerance; }
    }

    /**
     * 验证上传文件的安全性
     *
     * @param objectName 对象名称
     * @param userId 用户ID
     * @param resourceType 资源类型
     * @param redissonClient Redis客户端
     * @param minioTemplate MinIO模板
     * @throws BusinessException 验证失败时抛出
     */
    public static void validateUploadSecurity(String objectName, Long userId, ResourceType resourceType, RedissonClient redissonClient, MinioTemplate minioTemplate) {
        String cacheKey = "upload:request:" + objectName;
        try {
            // 1.验证缓存的上传请求信息
            RBucket<Map<String, Object>> bucket = redissonClient.getBucket(cacheKey);
            Map<String, Object> requestInfo = bucket.get();
            if (requestInfo == null) {
                log.warn("{}上传验证失败：缓存信息不存在，对象: {}, 用户: {}",
                        resourceType.getDisplayName(), objectName, userId);
                throw new BusinessException(20008, resourceType.getDisplayName() + "上传请求已过期或无效");
            }
            // 2.验证用户身份
            validateUserIdentity(objectName, userId, requestInfo, resourceType);
            // 3.验证文件大小
            validateFileSize(objectName, requestInfo, resourceType, minioTemplate);
            // 4.验证时间窗口
            validateTimeWindow(objectName, requestInfo, resourceType);
            // 5.验证文件安全性（恶意内容检测）
            // String expectedContentType = getMimeTypeFromSuffix((String) requestInfo.get("fileSuffix"));
            // FileSecurityUtil.validateFileSecurity(bucketName, objectName, expectedContentType, minioTemplate);
            // 6.验证成功，清理缓存
            bucket.delete();
            log.info("{}上传安全验证通过，对象: {}, 用户: {}",
                    resourceType.getDisplayName(), objectName, userId);
        } catch (BusinessException e) {
            // 清理可能的缓存
            cleanupCache(redissonClient, cacheKey);
            throw e;
        } catch (Exception e) {
            log.error("{}上传安全验证异常，对象: {}, 用户: {}",
                     resourceType.getDisplayName(), objectName, userId, e);
            cleanupCache(redissonClient, cacheKey);
            throw new BusinessException(20013, resourceType.getDisplayName() + "安全验证异常");
        }
    }

    /**
     * 验证用户身份
     */
    private static void validateUserIdentity(String objectName, Long userId, Map<String, Object> requestInfo, ResourceType resourceType) {
        Long cachedUserId = ((Number) requestInfo.get("userId")).longValue();
        if (!userId.equals(cachedUserId)) {
            log.error("{}上传验证失败：用户身份不匹配，对象: {}, 期望用户: {}, 实际用户: {}",
                     resourceType.getDisplayName(), objectName, userId, cachedUserId);
            throw new BusinessException(20009, "用户身份验证失败");
        }
    }

    /**
     * 验证文件大小
     */
    private static void validateFileSize(String objectName, Map<String, Object> requestInfo, ResourceType resourceType, MinioTemplate minioTemplate) {
        Long expectedSize = ((Number) requestInfo.get("fileSize")).longValue();

        try {
            io.minio.StatObjectResponse stat = minioTemplate.statObject(objectName);
            long actualSize = stat.size();
            long maxAllowedSize = (long) (expectedSize * (1 + resourceType.getTolerance()));

            if (actualSize > maxAllowedSize) {
                log.warn("{}上传验证失败：文件大小超限，对象: {}, 期望: {}字节, 实际: {}字节, 限制: {}字节, 容差: {}%",
                        resourceType.getDisplayName(), objectName, expectedSize, actualSize,
                        maxAllowedSize, (int)(resourceType.getTolerance() * 100));
                // 删除超大文件
                minioTemplate.removeObject(objectName);
                throw new BusinessException(20010, resourceType.getDisplayName() + "文件大小超出申请范围");
            }

            log.debug("{}文件大小验证通过，对象: {}, 期望: {}字节, 实际: {}字节, 容差: {}%",
                     resourceType.getDisplayName(), objectName, expectedSize, actualSize,
                     (int)(resourceType.getTolerance() * 100));

        } catch (Exception e) {
            if (e instanceof BusinessException) {
                throw e;
            }
            log.error("验证{}文件大小失败: {}", resourceType.getDisplayName(), objectName, e);
            throw new BusinessException(20011, resourceType.getDisplayName() + "文件验证失败");
        }
    }

    /**
     * 验证时间窗口
     */
    private static void validateTimeWindow(String objectName, Map<String, Object> requestInfo, ResourceType resourceType) {
        Long timestamp = ((Number) requestInfo.get("timestamp")).longValue();
        long currentTime = System.currentTimeMillis();
        long timeWindow = getTimeWindow(resourceType);

        if (currentTime - timestamp > timeWindow) {
            log.warn("{}上传验证失败：时间窗口超时，对象: {}, 请求时间: {}, 当前时间: {}, 窗口: {}分钟",
                    resourceType.getDisplayName(), objectName, timestamp, currentTime, timeWindow / 60000);
            throw new BusinessException(20012, resourceType.getDisplayName() + "上传时间窗口已过期");
        }
    }

    /**
     * 获取不同资源类型的时间窗口
     */
    private static long getTimeWindow(ResourceType resourceType) {
        return switch (resourceType) {
            case AVATAR, PICTURE, VOICE -> 5 * 60 * 1000; // 5分钟
            case VIDEO -> 15 * 60 * 1000; // 视频15分钟
            case FILE -> 10 * 60 * 1000; // 文件10分钟
        };
    }

    /**
     * 清理缓存
     */
    private static void cleanupCache(RedissonClient redissonClient, String cacheKey) {
        try {
            redissonClient.getBucket(cacheKey).delete();
        } catch (Exception ignored) {
            // 忽略清理异常
        }
    }

    /**
     * 缓存上传请求信息
     *
     * @param objectName 对象名称
     * @param fileSize 文件大小
     * @param fileSuffix 文件后缀
     * @param userId 用户ID
     * @param resourceType 资源类型
     * @param redissonClient Redis客户端
     */
    public static void cacheUploadRequest(String objectName, Long fileSize, String fileSuffix, Long userId, ResourceType resourceType, RedissonClient redissonClient) {
        cacheUploadRequest(objectName, fileSize, fileSuffix, userId, resourceType, null, redissonClient);
    }

    /**
     * 缓存上传请求信息（支持额外元数据）
     *
     * @param objectName 对象名称
     * @param fileSize 文件大小
     * @param fileSuffix 文件后缀
     * @param userId 用户ID
     * @param resourceType 资源类型
     * @param duration 语音时长（可选，仅语音文件需要）
     * @param redissonClient Redis客户端
     */
    public static void cacheUploadRequest(String objectName, Long fileSize, String fileSuffix, Long userId, ResourceType resourceType, Integer duration, RedissonClient redissonClient) {
        String cacheKey = "upload:request:" + objectName;
        Map<String, Object> requestInfo = new java.util.HashMap<>();
        requestInfo.put("fileSize", fileSize);
        requestInfo.put("fileSuffix", fileSuffix);
        requestInfo.put("userId", userId);
        requestInfo.put("resourceType", resourceType.name());
        requestInfo.put("timestamp", System.currentTimeMillis());

        // 语音文件特殊处理：缓存时长信息
        if (resourceType == ResourceType.VOICE && duration != null) {
            requestInfo.put("duration", duration);
        }

        long cacheMinutes = getTimeWindow(resourceType) / 60000;
        RBucket<Map<String, Object>> bucket = redissonClient.getBucket(cacheKey);
        bucket.set(requestInfo, java.time.Duration.ofMinutes(cacheMinutes));

        log.debug("缓存{}上传请求信息，对象: {}, 用户: {}, 大小: {}字节, 时长: {}秒, 缓存时间: {}分钟",
                 resourceType.getDisplayName(), objectName, userId, fileSize, duration, cacheMinutes);
    }

    /**
     * 根据文件后缀获取MIME类型
     */
    private static String getMimeTypeFromSuffix(String fileSuffix) {
        return switch (fileSuffix.toLowerCase()) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".avif" -> "image/avif";
            case ".svg" -> "image/svg+xml";
            default -> "application/octet-stream";
        };
    }
}
