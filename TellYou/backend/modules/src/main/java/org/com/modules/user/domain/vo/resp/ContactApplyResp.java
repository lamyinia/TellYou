package org.com.modules.user.domain.vo.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class ContactApplyResp {
    @Schema(description = "自增ID")
    private Long applyId;

    @Schema(description = "申请人 id")
    private Long applyUserId;

    @Schema(description = "目标 id")
    private Long targetId;

    @Schema(description = "投递 id")
    private Long deliverId;

    @Schema(description = "联系人类型 1:好友 2:群组")
    private Integer contactType;

    @Schema(description = "最后申请时间")
    private Date lastApplyTime;

    @Schema(description = "状态0: 待处理 1:已同意  2:已拒绝  3:已拉黑")
    private Integer status;

    @Schema(description = "申请信息")
    private String applyInfo;

    @Schema(description = "目标头像")
    private String avatar;

    @Schema(description = "目标图片")
    private String targetName;
}
