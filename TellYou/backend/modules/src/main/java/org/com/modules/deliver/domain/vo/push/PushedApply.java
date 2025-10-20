package org.com.modules.deliver.domain.vo.push;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class PushedApply {
    @Schema(description = "申请ID")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long applyId;

    @Schema(description = "申请人 id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long applyUserId;

    @Schema(description = "目标 id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long targetId;

    @Schema(description = "投递 id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long receiverId;

    @Schema(description = "联系人类型 1:好友 2:群组")
    private Integer contactType;

    @Schema(description = "最后申请时间")
    private Date lastApplyTime;

    @Schema(description = "状态0: 待处理 1:已同意  2:已拒绝  3:已拉黑")
    private Integer status;

    @Schema(description = "申请信息")
    private String applyInfo;
}
