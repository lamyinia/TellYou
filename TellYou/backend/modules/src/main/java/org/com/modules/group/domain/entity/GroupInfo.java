package org.com.modules.group.domain.entity;


import java.util.Date;

import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GroupInfo {
    @TableId
    @Schema(description = "id")
    private Long id;

    @Schema(description = "会话id")
    private Long sessionId;

    @Schema(description = "群主id")
    private Long groupOwnerId;

    @Schema(description = "群名称")
    private String name;

    @Schema(description = "群头像")
    private String avatar;

    @Schema(description = "最大成员数")
    private Integer maxMembers;

    @Schema(description = "当前成员数")
    private Integer memberCount;

    @Schema(description = "1=自由加入 2=需审核")
    private Integer joinMode;

    @Schema(description = "1=所有人可发言 2=仅管理员")
    private Integer msgMode;

    @Schema(description = "逻辑删除(1-删除,0-未删除)")
    private Integer isDeleted;

    @Schema(description = "乐观锁版本")
    private Integer version;

    @Schema(description = "创建时间")
    private Date createTime;

    @Schema(description = "修改时间")
    private Date updateTime;

    @Schema(description = "群名片")
    private String card;

    @Schema(description = "群公告")
    private String notification;
}
