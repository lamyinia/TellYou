package org.com.modules.user.domain.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.Date;

@Data
@Builder
public class ContactApply {
    @Schema(description = "申请ID")
    @TableId(value = "apply_id")
    private Long applyId;

    @Schema(description = "申请人 id")
    private Long applyUserId;

    @Schema(description = "目标 id")
    private Long targetId;

    @Schema(description = "联系人类型 0:好友 1:群组")
    private Integer contactType;

    @Schema(description = "最后申请时间")
    private Date lastApplyTime;

    @Schema(description = "状态0: 待处理 1:已同意  2:已拒绝  3:已拉黑")
    private Integer status;

    @Schema(description = "申请信息")
    private String applyInfo;
}
