package org.com.modules.mail.cache.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.com.modules.mail.cache.enums.MuteType;

import java.io.Serializable;

/**
 * 禁言信息实体
 */
@Data
@ToString
@AllArgsConstructor
@NoArgsConstructor
public class MuteInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 禁言类型
     */
    private MuteType muteType;

    /**
     * 禁言结束时间（临时禁言使用，永久禁言为null）
     */
    private Long muteEndTime;

    /**
     * 禁言创建时间
     */
    private Long createTime;

    /**
     * 禁言原因
     */
    private String reason;

    /**
     * 检查禁言是否仍然有效
     */
    public boolean isActive() {
        if (muteType == MuteType.NONE) {
            return false;
        }
        if (muteType == MuteType.PERMANENT || muteType == MuteType.GROUP_ALL) {
            return true;
        }
        if (muteType == MuteType.TEMPORARY) {
            return muteEndTime != null && System.currentTimeMillis() < muteEndTime;
        }
        return false;
    }
}
