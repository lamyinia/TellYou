package org.com.modules.common.domain.document;

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
 * 每一个信息都要存储接受者 id 的集合吗 ?
 * 如果是多聊的话，考虑到会有群成员的进入和退出，如果不存接受者 id 的集合的话，仅靠查 session_id 的群成员
 * 那么 ack 的对象就会始终处于动态变化的情况，所以定死 uids，从业务需求和业务实现的角度来说，都会更合理
 */
/**
 * 如何去保证同一个 session 内，消息的时序性？
 * 客户端在发消息时会带两个关键信息，一个是发消息时当前会话最新的序列号，另一个是当前的 UTC 时区的时间戳
 */
/**
 * 如何去保证消息的幂等性？
 */

/**
 * 实现信箱机制的消息信件实体
 * @author lanye
 * @date 2025/07/27
 */
@Data
@Builder
@ToString
@Document(collection = "message_mailbox")
@CompoundIndexes({
        @CompoundIndex(name = "idx_session_sequence", def = "{'sessionId': 1, 'sequenceNumber': 1}"),
        @CompoundIndex(name = "idx_session_timestamp", def = "{'sessionId': 1, 'clientTimestamp': 1}"),
        @CompoundIndex(name = "idx_status_timestamp", def = "{'status': 1, 'clientTimestamp': 1}"),
        @CompoundIndex(name = "idx_sender_timestamp", def = "{'senderId': 1, 'clientTimestamp': 1}")
})
public class MessageMailboxDocument {
    @Id
    private String messageId;
    /** 会话ID */
    @Indexed
    @Field("session_id")
    private Long sessionId;

    /** 会话内序列号（用于时序性） */
    @Field("sequence_number")
    private Long sequenceNumber;

    /** 客户端消息ID（用于幂等性） */
    @Field("client_message_id")
    private String clientMessageId;

    /** 消息类型 */
    @Field("message_type")
    private String messageType;

    /** 发送者ID */
    @Indexed
    @Field("sender_id")
    private Long senderId;

    /** 消息内容 */
    @Field("content")
    private String content;

    /** 调整后的时间戳（用于时序排序） */
    @Field("adjusted_timestamp")
    private String adjustedTimestamp;

    /** 消息是否撤回 */
    @Field("is_recalled")
    private Boolean isRecalled;

    /**
     * 更具体的内容
     */
    @Field("extra")
    private Map<String, Object> extra;

    /** 创建时间 */
    @Field("create_time")
    private Long createTime;

    /** 更新时间 */
    @Field("update_time")
    private Long updateTime;

    /**
     * ack 状态
     */
    @Field("ack_status")
    private Integer ackStatus;
}

