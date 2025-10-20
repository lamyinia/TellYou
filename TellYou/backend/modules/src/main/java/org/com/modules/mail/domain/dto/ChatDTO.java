package org.com.modules.mail.domain.dto;

import lombok.Data;
import lombok.ToString;

import java.io.Serializable;
import java.util.Map;

@Data
@ToString
public class ChatDTO implements Serializable {
    /** 客户端消息ID（用于幂等性或者ack确认） */
    private String messageId;

    /** 消息类型（如 text、image、file、system、heartbeat 等） */
    private Integer type;

    /** 发送者ID */
    private Long fromUid;

    /** 接收者ID（单聊/群聊） */
    private Long toUserId;

    /** 会话 id */
    private Long sessionId;

    /** 消息内容（文本、图片URL、文件URL等） */
    private String content;

    /** 发送时间（时间戳） */
    private Long timestamp;

    /** 扩展字段（如图片宽高、文件大小等，JSON字符串或Map） */
    private Map<String, Object> extra;
}
