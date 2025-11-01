package org.com.modules.mail.domain.dto;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;

import java.io.Serializable;
import java.util.Map;

@Data
@Builder
@ToString
public class ChatDTO implements Serializable {
    /** 客户端消息ID（用于幂等性或者ack确认） */
    private String messageId;

    /**
     * 消息类型，文本消息还是多媒体消息，群聊还是单聊
     * @see
     * org.com.modules.mail.domain.enums.MessageTypeEnum
     */
    private Integer type;

    /** 发送者ID */
    private Long fromUserId;

    /** 接收者ID（单聊/群聊） */
    private Long targetId;

    /** 会话 id */
    private Long sessionId;

    /** 消息内容（文本、图片URL、文件URL等） */
    private String content;

    /** 发送时间（时间戳） */
    private Long timestamp;

    /** 扩展字段 */
    private Map<String, Object> extra;
}
