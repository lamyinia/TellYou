package org.com.modules.common.util;

import lombok.extern.slf4j.Slf4j;
import org.com.tools.exception.BusinessException;
import org.com.tools.template.MinioTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Map;

/**
 * 文件安全验证工具类
 * 提供恶意内容检测和文件头验证
 * 
 * @author lanye
 * @date 2025/10/21
 */
@Slf4j
public class FileSecurityUtil {
    
    /**
     * 常见文件类型的文件头魔数
     */
    private static final Map<String, byte[]> FILE_SIGNATURES = Map.of(
        "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF},
        "image/png", new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
        "image/gif", new byte[]{0x47, 0x49, 0x46, 0x38},
        "image/webp", new byte[]{0x52, 0x49, 0x46, 0x46}, // RIFF
        "image/avif", new byte[]{0x00, 0x00, 0x00, 0x20} // ftyp
    );
    
    /**
     * 危险文件扩展名黑名单
     */
    private static final String[] DANGEROUS_EXTENSIONS = {
        ".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".js", ".jar",
        ".php", ".jsp", ".asp", ".aspx", ".py", ".pl", ".sh", ".ps1"
    };
    
    /**
     * 验证文件安全性（文件头 + 内容扫描）
     * 
     * @param bucketName 存储桶名称
     * @param objectName 对象名称
     * @param expectedContentType 期望的Content-Type
     * @param minioTemplate MinIO模板
     * @throws BusinessException 验证失败时抛出
     */
    public static void validateFileSecurity(String bucketName, String objectName, String expectedContentType, MinioTemplate minioTemplate) throws IOException {
        try {
            // 1. 检查文件扩展名黑名单
            validateFileExtension(objectName);
            
            // 2. 验证文件头魔数
            validateFileSignature(bucketName, objectName, expectedContentType, minioTemplate);
            
            // 3. 内容安全扫描
            validateFileContent(bucketName, objectName, expectedContentType, minioTemplate);
            
            log.info("文件安全验证通过: {}", objectName);
            
        } catch (BusinessException e) {
            // 验证失败，删除可能的恶意文件
            try {
                minioTemplate.removeObject(bucketName, objectName);
                log.warn("检测到恶意文件，已删除: {}/{}", bucketName, objectName);
            } catch (Exception ignored) {}
            throw e;
        } catch (Exception e) {
            log.error("文件安全验证异常: {}", objectName, e);
            throw new BusinessException(20014, "文件安全验证失败");
        }
    }
    
    /**
     * 验证文件扩展名
     */
    private static void validateFileExtension(String objectName) {
        String lowerName = objectName.toLowerCase();
        for (String dangerousExt : DANGEROUS_EXTENSIONS) {
            if (lowerName.endsWith(dangerousExt)) {
                log.error("检测到危险文件扩展名: {}", objectName);
                throw new BusinessException(20015, "不允许上传此类型文件");
            }
        }
    }
    
    /**
     * 验证文件头魔数
     */
    private static void validateFileSignature(String bucketName, String objectName, String expectedContentType, MinioTemplate minioTemplate) throws IOException {
        byte[] expectedSignature = FILE_SIGNATURES.get(expectedContentType);
        if (expectedSignature == null) {
            log.warn("未知的Content-Type，跳过文件头验证: {}", expectedContentType);
            return;
        }
        
        try (InputStream inputStream = minioTemplate.getObject(bucketName, objectName)) {
            byte[] fileHeader = new byte[expectedSignature.length];
            int bytesRead = inputStream.read(fileHeader);
            
            if (bytesRead < expectedSignature.length) {
                throw new BusinessException(20016, "文件头读取失败或文件过小");
            }
            
            if (!Arrays.equals(fileHeader, expectedSignature)) {
                log.error("文件头验证失败: {} 期望: {} 实际: {}", 
                         objectName, 
                         Arrays.toString(expectedSignature), 
                         Arrays.toString(fileHeader));
                throw new BusinessException(20017, "文件类型与内容不匹配");
            }
            
        } catch (Exception e) {
            if (e instanceof BusinessException) {
                throw e;
            }
            log.error("文件头验证异常: {}", objectName, e);
            throw new BusinessException(20018, "文件头验证失败");
        }
    }
    
    /**
     * 验证文件内容安全性
     */
    private static void validateFileContent(String bucketName, String objectName, String expectedContentType, MinioTemplate minioTemplate) throws IOException {
        // SVG文件特殊处理 - 检测恶意脚本
        if ("image/svg+xml".equals(expectedContentType)) {
            validateSvgContent(bucketName, objectName, minioTemplate);
        }
        
        // 图片文件 - 检测隐藏的恶意内容
        if (expectedContentType.startsWith("image/")) {
            validateImageContent(bucketName, objectName, minioTemplate);
        }
    }
    
    /**
     * 验证SVG文件内容
     */
    private static void validateSvgContent(String bucketName, String objectName, MinioTemplate minioTemplate) throws IOException {
        try (InputStream inputStream = minioTemplate.getObject(bucketName, objectName)) {
            String content = new String(inputStream.readAllBytes());
            
            // 检测危险标签和属性
            String[] dangerousPatterns = {
                "<script", "javascript:", "onload=", "onerror=", "onclick=",
                "eval(", "document.", "window.", "alert(", "confirm("
            };
            
            String lowerContent = content.toLowerCase();
            for (String pattern : dangerousPatterns) {
                if (lowerContent.contains(pattern)) {
                    log.error("SVG文件包含恶意脚本: {} 模式: {}", objectName, pattern);
                    throw new BusinessException(20019, "SVG文件包含恶意内容");
                }
            }
            
        } catch (Exception e) {
            if (e instanceof BusinessException) {
                throw e;
            }
            log.error("SVG内容验证异常: {}", objectName, e);
            throw new BusinessException(20020, "SVG内容验证失败");
        }
    }
    
    /**
     * 验证图片文件内容
     */
    private static void validateImageContent(String bucketName, String objectName, MinioTemplate minioTemplate) throws IOException {
        try (InputStream inputStream = minioTemplate.getObject(bucketName, objectName)) {
            byte[] content = inputStream.readAllBytes();
            
            // 检测嵌入的可执行代码特征
            String contentStr = new String(content);
            String[] suspiciousPatterns = {
                "<?php", "<%", "<script", "eval(", "exec(", "system("
            };
            
            for (String pattern : suspiciousPatterns) {
                if (contentStr.contains(pattern)) {
                    log.error("图片文件包含可疑内容: {} 模式: {}", objectName, pattern);
                    throw new BusinessException(20021, "图片文件包含恶意内容");
                }
            }
            
        } catch (Exception e) {
            if (e instanceof BusinessException) {
                throw e;
            }
            log.error("图片内容验证异常: {}", objectName, e);
            throw new BusinessException(20022, "图片内容验证失败");
        }
    }
}
