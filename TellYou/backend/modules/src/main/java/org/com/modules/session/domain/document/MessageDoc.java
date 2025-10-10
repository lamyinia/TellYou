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
 * 消息内容实体 - 信箱机制的核心消息存储
 *
 * 设计原则：
 * 1. 消息内容与用户信箱分离，一条消息内容可被多个用户信箱引用
 * 2. 支持消息的时序性、幂等性、状态管理
 * 3. 优化存储空间，避免重复存储相同消息内容
 *
 * @author lanye
 * @date 2025/07/27
 */
@Data
@Builder
@ToString
@Document(collection = "message_content")
@CompoundIndexes({
        @CompoundIndex(name = "idx_session_sequence", def = "{'sessionId': 1, 'sequenceNumber': 1}"),
        @CompoundIndex(name = "idx_session_timestamp", def = "{'sessionId': 1, 'clientTimestamp': 1}"),
        @CompoundIndex(name = "idx_sender_timestamp", def = "{'senderId': 1, 'clientTimestamp': 1}"),
        @CompoundIndex(name = "idx_type_timestamp", def = "{'messageType': 1, 'clientTimestamp': 1}")
})
public class MessageDoc {
    @Id
    private String messageId;
    /** 会话ID */
    @Indexed
    @Field("session_id")
    private Long sessionId;

    /** 会话内序列号（用于时序性保证） */
    @Field("sequence_number")
    private Long sequenceNumber;

    /** 客户端消息ID（用于幂等性保证） */
    @Indexed
    @Field("client_message_id")
    private String clientMessageId;

    /** 消息类型：1-文本 2-图片 3-语音 4-视频 5-文件 6-红包 7-系统消息 */
    @Field("message_type")
    private Integer messageType;

    /** 发送者ID */
    @Indexed
    @Field("sender_id")
    private Long senderId;

    /** 消息内容（文本内容或文件URL） */
    @Field("content")
    private String content;

    /** 客户端时间戳（用于时序排序） */
    @Field("client_timestamp")
    private Long clientTimestamp;

    /** 服务器时间戳（用于最终排序） */
    @Field("adjusted_timestamp")
    private String adjustedTimestamp;

    /** 消息是否撤回 */
    @Field("is_recalled")
    private Boolean isRecalled;

    /** 撤回时间 */
    @Field("recall_time")
    private Long recallTime;

    /** 消息状态：0-正常 1-撤回 2-删除 */
    @Field("status")
    private Integer status;

    /** 创建时间 */
    @Field("create_time")
    private Long createTime;

    /** 更新时间 */
    @Field("update_time")
    private Long updateTime;

    /** 消息过期时间（用于自动清理） */
    @Field("expire_time")
    private Long expireTime;

    /** 消息扩展信息（文件大小、时长、红包金额等） */
    @Field("extra")
    private Map<String, Object> extra;
}

