package org.com.modules.mail.cache.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.io.Serializable;
import java.util.List;

/**
 * 缓存失效消息实体
 */

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class CacheMissMessage implements Serializable {

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
     * 失效的 key
     */
    private List<String> keys;

    public static final String CACHE_TYPE_GROUP_MEMBERS = "GROUP_MEMBERS";
    public static final String CACHE_TYPE_FRIEND_RELATION = "FRIEND_RELATION";
    public static final String CACHE_TYPE_MUTE_INFO = "MUTE_INFO";

    public static final String OPERATION_ADD = "ADD";
    public static final String OPERATION_REMOVE = "REMOVE";
}
