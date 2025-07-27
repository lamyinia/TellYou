package org.com.modules.chat.domain.entity;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
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
 * @author lanye
 * @date 2025/07/27
 * @description 实现信箱机制的消息信件实体
 */
@Data
@Builder
@ToString
@Document(collection = "message_mailbox")
@CompoundIndexes({
        // 会话内消息按时间戳和序列号排序
        @CompoundIndex(name = "idx_session_sequence", def = "{'sessionId': 1, 'sequenceNumber': 1}"),
        // 会话内消息按时间戳排序
        @CompoundIndex(name = "idx_session_timestamp", def = "{'sessionId': 1, 'clientTimestamp': 1}"),
        // 按状态和时间戳查询
        @CompoundIndex(name = "idx_status_timestamp", def = "{'status': 1, 'clientTimestamp': 1}"),
        // 按发送者和时间戳查询
        @CompoundIndex(name = "idx_sender_timestamp", def = "{'senderId': 1, 'clientTimestamp': 1}")
})
public class MessageMailBox {
    @Id
    private String id;

    /** 会话ID */
    @Indexed
    @Field("session_id")
    private Long sessionId;

    /** 客户端消息ID（用于幂等性） */
    @Field("client_message_id")
    private String clientMessageId;

    /** 服务端消息ID（全局唯一） */
    @Field("server_message_id")
    private String serverMessageId;

    /** 会话内序列号（用于时序性） */
    @Field("sequence_number")
    private Long sequenceNumber;

    /** 消息类型 */
    @Field("message_type")
    private String messageType;

    /** 发送者ID */
    @Indexed
    @Field("sender_id")
    private Long senderId;

    /** 接收者ID列表 */
    @Field("to_user_ids")
    private List<Long> toUserIds;

    /** 消息内容 */
    @Field("content")
    private String content;

    /** 客户端时间戳 */
    @Indexed
    @Field("client_timestamp")
    private Long clientTimestamp;

    /** 服务器时间戳 */
    @Field("server_timestamp")
    private Long serverTimestamp;

    /** 调整后的时间戳（用于时序排序） */
    @Field("adjusted_timestamp")
    private Long adjustedTimestamp;

    /** 创建时间 */
    @Field("create_time")
    private Long createTime;

    /** 更新时间 */
    @Field("update_time")
    private Long updateTime;

    /** 消息状态：0-待处理 1-处理中 2-已发送 3-已送达 4-已读 5-发送失败 */
    @Indexed
    @Field("status")
    private Integer status;

    /** 消息确认状态映射 */
    @Field("ack_status")
    private Map<String, MessageAck> ackStatus;

    /** 处理锁（用于并发控制） */
    @Field("processing_lock")
    private ProcessingLock processingLock;

    /** 消息是否已过期 */
    @Field("expired")
    private Boolean expired;

    /** 过期时间 */
    @Field("expire_time")
    private Long expireTime;

    public static class MessageAck {
        private String userId;
        private Integer status;
        private Long ackTime;
    }
    private static class ProcessingLock {
        private String lockHolder;
        private Long lockTime;
        private Long lockExpireTime;
        private Long lockVersion;
    }
}

// Rocket

