package org.com.modules.chat.domain.dto;

import lombok.Data;
import lombok.ToString;

import java.io.Serializable;
import java.util.Map;

@Data
@ToString
public class ChatMessageDTO implements Serializable {
    /** 消息类型（如 text、image、file、system、heartbeat 等） */
    private String type;
    /** 发送者ID */
    private String fromUserId;
    /** 接收者ID（单聊/群聊） */
    private String toUserId;
    /** 消息内容（文本、图片URL、文件URL等） */
    private String content;
    /** 发送时间（时间戳） */
    private Long timestamp;
    /** 扩展字段（如图片宽高、文件大小等，JSON字符串或Map） */
    private Map<String, Object> extra;
}
