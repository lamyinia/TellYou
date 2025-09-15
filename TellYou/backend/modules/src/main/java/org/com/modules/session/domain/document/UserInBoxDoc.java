package org.com.modules.session.domain.document;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Map;

/**
 * 用户信箱实体 - 信箱机制的用户消息状态管理
 *
 * 设计原则：
 * 1. 每个用户在每个会话中都有独立的信箱，记录消息的接收状态
 * 2. 支持多端同步，不同设备的消息状态独立管理
 * 3. 支持离线消息、消息确认、已读回执等功能
 * 4. 通过引用消息ID实现与消息内容的关联
 *
 * @author lanye
 * @date 2025/07/27
 */
@Data
@ToString
@Document(collection = "user_inbox")
@CompoundIndexes({
        @CompoundIndex(name = "idx_user_adjustedTimestamp", def = "{'userId': 1, 'adjustedTimestamp': 1}"),
        @CompoundIndex(name = "idx_uid_qid", def = "{'userId': 1, 'quoteId': 1}", unique = true)
    })
public class UserInBoxDoc {
    @Id
    private String inboxId;
    /** 用户ID */
    @Indexed
    @Field("user_id")
    private Long userId;

    @Indexed
    @Field("sender_id")
    private Long senderId;
    /** 会话ID */
    @Indexed
    @Field("session_id")
    private Long sessionId;

    /** 引用ID */
    @Indexed
    @Field("quote_id")
    private String quoteId;

    @Indexed
    @Field("quote_type")
    private Integer quoteType;

    /** 消息内容（文本内容或文件URL） */
    @Field("content")
    private String content;

    /** 服务器时间戳（用于最终排序） */
    @Field("adjusted_timestamp")
    private String adjustedTimestamp;


    /** 扩展信息（设备信息、网络状态等） */
    @Field("extra")
    private Map<String, Object> extra;
}
