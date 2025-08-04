package org.com.modules.session.domain.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.Date;

/**
 * 会话文档
 * @author lanye
 * @date 2025/08/01
 */
@Data
@Builder
@Document(collection = "session")
public class SessionDocument {

    /**
     * 会话id（雪花算法）
     */
    @Id
    private Long sessionId;

    /**
     * 会话类型：1单聊 2群聊 3系统
     */
    @Field("session_type")
    private Integer sessionType;

    /**
     * 最后一条消息id
     */
    @Field("last_msg_id")
    private Long lastMsgId;

    /**
     * 最后消息摘要
     */
    @Field("last_msg_content")
    private String lastMsgContent;

    /**
     * 最后消息时间（毫秒精度）
     */
    @Field("last_msg_time")
    private LocalDateTime lastMsgTime;

    /**
     * 会话内随消息生成而自增的id
     */
    @Field("sequence_id")
    private Long sequenceId;

    /**
     * 软删除标记
     */
    @Field("is_deleted")
    private Integer isDeleted;

    /**
     * 创建时间
     */
    @Field("created_at")
    private Date createdAt;

    /**
     * 最后修改时间
     */
    @Field("updated_at")
    private Date updatedAt;

    /**
     * 额外信息（根据不同类型房间有不同存储的东西）
     */
    @Field("ext_json")
    private String extJson;
}