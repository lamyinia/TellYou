package org.com.tools.template;

import cn.hutool.core.date.DatePattern;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.io.file.FileNameUtil;
import cn.hutool.core.util.StrUtil;
import io.minio.*;
import io.minio.http.Method;
import io.minio.messages.*;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.properties.MinioProperties;
import org.com.tools.template.domain.OssReq;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * @author lanye
 * @date 2025/08/08
 */
@Slf4j
@AllArgsConstructor
public class MinioTemplate {

    /**
     * MinIO 客户端
     */
    private MinioClient minioClient;

    /**
     * MinIO 配置类
     */
    private MinioProperties minioProperties;

    /**
     * 查询所有存储桶
     *
     * @return Bucket 集合
     */
    @SneakyThrows
    public List<Bucket> listBuckets() {
        return minioClient.listBuckets();
    }

    /**
     * 桶是否存在
     *
     * @param bucketName 桶名
     * @return 是否存在
     */
    @SneakyThrows
    public boolean bucketExists(String bucketName) {
        return minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
    }

    /**
     * 创建存储桶
     *
     * @param bucketName 桶名
     */
    @SneakyThrows
    public void makeBucket(String bucketName) {
        if (!bucketExists(bucketName)) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }
    }

    /**
     * 删除一个空桶 如果存储桶存在对象不为空时，删除会报错。
     *
     * @param bucketName 桶名
     */
    @SneakyThrows
    public void removeBucket(String bucketName) {
        minioClient.removeBucket(RemoveBucketArgs.builder().bucket(bucketName).build());
    }

    /**
     * 检查对象是否存在
     *
     * @param path 对象路径
     * @return 是否存在
     */
    @SneakyThrows
    public boolean objectExists(String path) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(path)
                            .build());
            return true;
        } catch (Exception e) {
            if (e.getMessage().contains("does not exist")) {
                return false;
            }
            throw e;
        }
    }

    /**
     * 生成预签名上传URL（PUT方法）
     *
     * @param path 对象路径
     * @return 预签名URL
     */
    @SneakyThrows
    public String getPreSignedObjectUrl(String path) {
        return getPreSignedObjectUrl(path, Method.PUT, 3600); // 默认1小时
    }


    /**
     * 生成预签名URL
     *
     * @param path 对象路径
     * @param method HTTP方法
     * @param expirySeconds 过期时间（秒）
     * @return 预签名URL
     */
    @SneakyThrows
    public String getPreSignedObjectUrl(String path, Method method, int expirySeconds) {
        if (StrUtil.isBlank(path)) {
            throw new IllegalArgumentException("对象路径不能为空");
        }
        if (expirySeconds <= 0 || expirySeconds > 604800) { // 最大7天
            throw new IllegalArgumentException("过期时间必须在1秒到7天之间");
        }

        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(method)
                            .bucket(minioProperties.getBucket())
                            .object(path)
                            .expiry(expirySeconds)
                            .build());
        } catch (Exception e) {
            log.error("生成预签名URL失败，路径: {}, 方法: {}, 过期时间: {}秒", path, method, expirySeconds, e);
            throw e;
        }
    }
    /**
     * GetObject接口用于获取某个文件（Object）。此操作需要对此Object具有读权限。
     *
     * @param bucketName  桶名
     * @param ossFilePath Oss文件路径
     */
    @SneakyThrows
    public InputStream getObject(String bucketName, String ossFilePath) {
        return minioClient.getObject(
                GetObjectArgs.builder().bucket(bucketName).object(ossFilePath).build());
    }

    /**
     * 查询桶的对象信息
     *
     * @param bucketName 桶名
     * @param recursive  是否递归查询
     * @return
     */
    @SneakyThrows
    public Iterable<Result<Item>> listObjects(String bucketName, boolean recursive) {
        return minioClient.listObjects(
                ListObjectsArgs.builder().bucket(bucketName).recursive(recursive).build());
    }

    /**
     * 生成随机文件名，防止重复
     *
     * @return
     */
    public String generateAutoPath(OssReq req) {
        String uid = Optional.ofNullable(req.getUid()).map(String::valueOf).orElse("000000");
        cn.hutool.core.lang.UUID uuid = cn.hutool.core.lang.UUID.fastUUID();
        String suffix = FileNameUtil.getSuffix(req.getFileName());
        String yearAndMonth = DateUtil.format(new Date(), DatePattern.NORM_MONTH_PATTERN);
        return req.getFilePath() + StrUtil.SLASH + yearAndMonth + StrUtil.SLASH + uid + StrUtil.SLASH + uuid + StrUtil.DOT + suffix;
    }

    /**
     * 获取带签名的临时上传元数据对象，前端可获取后，直接上传到Minio
     *
     * @param bucketName
     * @param fileName
     * @return
     */
    @SneakyThrows
    public Map<String, String> getPreSignedPostFormData(String bucketName, String fileName) {

        PostPolicy policy = new PostPolicy(bucketName, ZonedDateTime.now().plusDays(7));

        policy.addEqualsCondition("key", fileName);
        policy.addStartsWithCondition("Content-Type", "image/");
        policy.addContentLengthRangeCondition(64 * 1024, 10 * 1024 * 1024);

        return minioClient.getPresignedPostFormData(policy);
    }

    /**
     * 上传文件到MinIO
     *
     * @param bucketName 存储桶名称
     * @param objectName 对象名称（包含路径）
     * @param inputStream 文件输入流
     * @param contentType 文件类型
     */
    @SneakyThrows
    public void putObject(String bucketName, String objectName, InputStream inputStream, String contentType) {
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .stream(inputStream, inputStream.available(), -1)
                        .contentType(contentType)
                        .build());
    }

    /**
     * 上传JSON文件到MinIO（使用默认配置的存储桶）
     *
     * @param objectName 对象名称（包含路径）
     * @param jsonContent JSON内容字符串
     */
    @SneakyThrows
    public void putJsonObject(String objectName, String jsonContent) {
        try (InputStream inputStream = new ByteArrayInputStream(jsonContent.getBytes(StandardCharsets.UTF_8))) {
            putObject(minioProperties.getBucket(), objectName, inputStream, "application/json");
        }
    }

    /**
     * 删除MinIO中的对象（文件）
     *
     * @param bucketName 存储桶名称
     * @param objectName 对象名称（包含路径）
     */
    @SneakyThrows
    public void removeObject(String bucketName, String objectName) {
        if (StrUtil.isBlank(bucketName) || StrUtil.isBlank(objectName)) {
            throw new IllegalArgumentException("存储桶名称和对象名称不能为空");
        }
        
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            log.info("成功删除对象: {}/{}", bucketName, objectName);
        } catch (Exception e) {
            log.error("删除对象失败: {}/{}, 错误: {}", bucketName, objectName, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 删除MinIO中的对象（使用默认配置的存储桶）
     *
     * @param objectName 对象名称（包含路径）
     */
    @SneakyThrows
    public void removeObject(String objectName) {
        removeObject(minioProperties.getBucket(), objectName);
    }

    /**
     * 批量删除MinIO中的对象
     *
     * @param bucketName 存储桶名称
     * @param objectNames 对象名称列表
     */
    @SneakyThrows
    public void removeObjects(String bucketName, List<String> objectNames) {
        if (StrUtil.isBlank(bucketName) || objectNames == null || objectNames.isEmpty()) {
            throw new IllegalArgumentException("存储桶名称和对象名称列表不能为空");
        }
        
        try {
            List<DeleteObject> objects = objectNames.stream()
                    .map(DeleteObject::new)
                    .collect(java.util.stream.Collectors.toList());
            
            Iterable<Result<DeleteError>> results = minioClient.removeObjects(
                    RemoveObjectsArgs.builder()
                            .bucket(bucketName)
                            .objects(objects)
                            .build()
            );
            
            // 检查删除结果
            for (Result<DeleteError> result : results) {
                DeleteError error = result.get();
                if (error != null) {
                    log.error("删除对象失败: {}, 错误: {}", error.objectName(), error.message());
                }
            }
            
            log.info("批量删除完成，共删除 {} 个对象", objectNames.size());
        } catch (Exception e) {
            log.error("批量删除对象失败: {}, 错误: {}", bucketName, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * 批量删除MinIO中的对象（使用默认配置的存储桶）
     *
     * @param objectNames 对象名称列表
     */
    @SneakyThrows
    public void removeObjects(List<String> objectNames) {
        removeObjects(minioProperties.getBucket(), objectNames);
    }

    /**
     * 删除MinIO中的对象（带版本控制）
     *
     * @param bucketName 存储桶名称
     * @param objectName 对象名称
     * @param versionId 版本ID
     */
    @SneakyThrows
    public void removeObject(String bucketName, String objectName, String versionId) {
        if (StrUtil.isBlank(bucketName) || StrUtil.isBlank(objectName) || StrUtil.isBlank(versionId)) {
            throw new IllegalArgumentException("存储桶名称、对象名称和版本ID不能为空");
        }
        
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .versionId(versionId)
                            .build()
            );
            log.info("成功删除对象版本: {}/{}, 版本ID: {}", bucketName, objectName, versionId);
        } catch (Exception e) {
            log.error("删除对象版本失败: {}/{}, 版本ID: {}, 错误: {}", bucketName, objectName, versionId, e.getMessage(), e);
            throw e;
        }
    }
}
