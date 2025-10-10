package org.com.modules.session.domain.entity;

import java.util.Date;

import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Session {
    @TableId
    @Schema(description="会话id（雪花算法）")
    private Long sessionId;

    @Schema(description="会话类型：1单聊 2群聊 3系统")
    private Integer sessionType;

    @Schema(description="乐观锁版本")
    private Integer version;

    @Schema(description="软删除标记")
    private Integer isDeleted;

    @Schema(description="创建时间")
    private Date createdAt;

    @Schema(description="更新时间")
    private Date updatedAt;

    @Schema(description="额外信息（根据不同类型房间有不同存储的东西）")
    private Object extJson;
}
