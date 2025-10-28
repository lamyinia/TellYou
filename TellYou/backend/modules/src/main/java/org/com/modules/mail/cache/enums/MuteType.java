package org.com.modules.mail.cache.enums;

/**
 * 禁言类型枚举
 */
public enum MuteType {
    /**
     * 无禁言
     */
    NONE(0, "无禁言"),
    
    /**
     * 临时禁言
     */
    TEMPORARY(1, "临时禁言"),
    
    /**
     * 永久禁言
     */
    PERMANENT(2, "永久禁言"),
    
    /**
     * 全群禁言
     */
    GROUP_ALL(3, "全群禁言");
    
    private final int code;
    private final String description;
    
    MuteType(int code, String description) {
        this.code = code;
        this.description = description;
    }
    
    public int getCode() {
        return code;
    }
    
    public String getDescription() {
        return description;
    }
    
    public static MuteType fromCode(int code) {
        for (MuteType type : values()) {
            if (type.code == code) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown mute type code: " + code);
    }
}
