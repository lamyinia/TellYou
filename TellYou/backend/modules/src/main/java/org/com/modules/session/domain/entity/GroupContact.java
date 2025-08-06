package org.com.modules.session.domain.entity;


import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "群关系实体类")
public class GroupContact {
    @Schema(description = "成员id")
    private Long userId;

    @Schema(description = "群组id")
    private Long groupId;

    @Schema(description = "会话id")
    private Long sessionId;

    @Schema(description = "1=成员 2=管理员 3=群主")
    private Integer role;

    @Schema(description = "加入时间")
    private Date joinTime;

    @Schema(description = "最后活跃时间")
    private Date lastActive;

    @Schema(description = "第几次进入群聊")
    private Integer contactVersion;
}
