package org.com.modules.contact.domain.document;

import lombok.Builder;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date;

/**
 * 会话文档
 * @author lanye
 * @date 2025/08/01
 */
@Data
@Builder
@Document(collection = "session")
public class SessionDoc {

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
