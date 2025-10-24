package org.com.modules.common.util;

import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.URLUtil;
import org.com.tools.constant.URLConstant;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;

public class UrlUtil {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ConcurrentHashMap<LocalDate, String> DATE_CACHE = new ConcurrentHashMap<>();

    // StringBuilder复用池（可选）
    private static final ThreadLocal<StringBuilder> STRING_BUILDER_POOL = ThreadLocal.withInitial(() -> new StringBuilder(128));

    public static Integer extractVersionFromUrl(String url){
        String splits[] = URLUtil.getPath(url).split("/");
        return Integer.parseInt(splits[splits.length-2]);
    }
    public static String getFirstOriginalAvatar(String host, String uid){
        return host + URLConstant.originalAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstThumbAvatar(String host, String uid){
        return host + URLConstant.thumbedAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstOriginalAvatar(String uid){
        return URLConstant.originalAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String getFirstThumbAvatar(String uid){
        return URLConstant.thumbedAvatarPath + uid + StrUtil.SLASH + "1" + StrUtil.SLASH + "index.avif";
    }
    public static String generateGroupAvatar(Long groupId){
        Long hash = System.currentTimeMillis();
        return URLConstant.groupAvatarPath + groupId + StrUtil.SLASH + hash + StrUtil.SLASH +"index.avif";
    }
    public static String getMimeType(String fileSuffix) {
        return switch (fileSuffix.toLowerCase()) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".avif" -> "image/avif";
            case ".mp3" -> "audio/mpeg";
            case ".wav" -> "audio/wav";
            case ".ogg" -> "audio/ogg";
            case ".mp4" -> "video/mp4";
            case ".webm" -> "video/webm";
            default -> "application/octet-stream";
        };
    }

    /**
     * 生成聊天文件对象名（高性能版本）
     * @param type 文件类型 (image/video/voice/file)
     * @param targetId 目标ID
     * @param hash 文件哈希
     * @param extension 文件扩展名（不带点号）
     * @return 对象名称
     */
    public static String generateObjectName(String type, String targetId, String hash, String extension) {  // extension 需要带 .
        if (StrUtil.hasBlank(type, targetId, hash, extension)) {
            throw new IllegalArgumentException("所有参数都不能为空");
        }

        // 使用缓存的日期字符串
        LocalDate today = LocalDate.now();
        String dateStr = DATE_CACHE.computeIfAbsent(today, date -> date.format(DATE_FORMATTER));

        // 使用StringBuilder替代String.format
        StringBuilder sb = STRING_BUILDER_POOL.get();
        sb.setLength(0); // 清空StringBuilder

        return sb.append("chat/")
                .append(type).append('/')
                .append(targetId).append('/')
                .append(dateStr).append('/')
                .append(hash).append("/index")
                .append(extension)
                .toString();
    }

    /**
     * 清理过期的日期缓存（建议定时任务调用）
     */
    public static void cleanupDateCache() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        DATE_CACHE.entrySet().removeIf(entry -> entry.getKey().isBefore(yesterday));
    }
}
