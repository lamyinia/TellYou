package org.com.modules.contact.domain.entity;


import java.util.Date;

import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Black {

    @Schema(description = "id")
    @TableId(value = "id")
    private Long id;

    @Schema(description = "黑名单发起者 id")
    private Long fromId;

    @Schema(description = "黑名单发起者类型 0=uid 1=gid")
    private Integer type;

    @Schema(description = "拉黑目标")
    private Long target;

    @Schema(description = "第几次拉黑")
    private Integer blackVersion;

    @Schema(description = "软删除标记")
    private Integer isDeleted;

    @Schema(description = "创建时间")
    private Date createTime;

    @Schema(description = "修改时间")
    private Date updateTime;
}
