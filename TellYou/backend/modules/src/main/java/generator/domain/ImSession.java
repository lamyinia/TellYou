package generator.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
* 会话表
* @TableName im_session
*/
@Data
public class ImSession implements Serializable {
    /**
    * 会话id（雪花算法）
    */
    @NotNull(message="[会话id（雪花算法）]不能为空")
    @Schema(description = "会话id（雪花算法）")
    private Long sessionId;
    /**
    * 会话类型：1单聊 2群聊 3系统
    */
    @NotNull(message="[会话类型：1单聊 2群聊 3系统]不能为空")
    @Schema(description = "会话类型：1单聊 2群聊 3系统")
    private Integer sessionType;
    /**
    * 最后一条消息id
    */
    @NotNull(message="[最后一条消息id]不能为空")
    @Schema(description = "最后一条消息id")
    private Long lastMsgId;
    /**
    * 最后消息摘要
    */
    @Size(max= 500,message="编码长度不能超过500")
    @Schema(description = "最后消息摘要")
    @Length(max= 500,message="编码长度不能超过500")
    private String lastMsgContent;
    /**
    * 最后消息时间（毫秒精度）
    */
    @NotNull(message="[最后消息时间（毫秒精度）]不能为空")
    @Schema(description = "最后消息时间（毫秒精度）")
    private LocalDateTime lastMsgTime;
    /**
    * 乐观锁版本
    */
    @Schema(description = "乐观锁版本")
    private Integer version;
    /**
    * 软删除标记
    */
    @Schema(description = "软删除标记")
    private Integer deletedStatus;
    /**
    *  创建时间
    */
    @Schema(description = "创建时间")
    private LocalDateTime createdAt;
    /**
    * 更新时间
    */
    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
