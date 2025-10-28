package org.com.modules.mail.cache.entity;

import lombok.Data;
import lombok.ToString;

import java.io.Serializable;
import java.util.Map;

/**
 * 缓存失效消息实体
 */

@Data
@ToString
public class CacheInvalidateMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 缓存类型
     */
    private String cacheType;

    /**
     * 操作类型
     */
    private String operation;

    /**
     * 目标ID（groupId、userId等）
     */
    private String targetId;

    /**
     * 具体变更数据
     */
    private Map<String, Object> data;

    /**
     * 消息发送时间
     */
    private Long timestamp;

    public CacheInvalidateMessage() {
        this.timestamp = System.currentTimeMillis();
    }

    public CacheInvalidateMessage(String cacheType, String operation, String targetId) {
        this();
        this.cacheType = cacheType;
        this.operation = operation;
        this.targetId = targetId;
    }

    // 缓存类型常量
    public static final String CACHE_TYPE_GROUP_MEMBERS = "GROUP_MEMBERS";
    public static final String CACHE_TYPE_FRIEND_RELATION = "FRIEND_RELATION";
    public static final String CACHE_TYPE_MUTE_INFO = "MUTE_INFO";

    // 操作类型常量
    public static final String OPERATION_ADD = "ADD";
    public static final String OPERATION_REMOVE = "REMOVE";
    public static final String OPERATION_UPDATE = "UPDATE";
    public static final String OPERATION_CLEAR = "CLEAR";
}
