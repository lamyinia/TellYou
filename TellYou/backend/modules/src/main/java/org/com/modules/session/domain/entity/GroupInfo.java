package org.com.modules.session.domain.entity;


import java.util.Date;

import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class GroupInfo {

    @Schema(description="id")
    @TableId
    private Long id;

    @Schema(description="会话id")
    private Long sessionId;

    @Schema(description="群主id")
    private Long groupOwnerId;

    @Schema(description="群名称")
    private String name;

    @Schema(description="群头像")
    private String avatar;

    @Schema(description="最大成员数")
    private Integer maxMembers;

    @Schema(description="当前成员数")
    private Integer memberCount;

    @Schema(description="1=自由加入 2=需审核 3=邀请加入")
    private Integer joinMode;

    @Schema(description="1=所有人可发言 2=仅管理员")
    private Integer msgMode;

    @Schema(description="逻辑删除(1-正常,0-删除)")
    private Integer isDeleted;

    @Schema(description="乐观锁版本")
    private Integer version;

    @Schema(description="创建时间")
    private Date createTime;

    @Schema(description="修改时间")
    private Date updateTime;

    @Schema(description="群名片")
    private String card;
}
