package org.com.modules.group.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.MANAGER_AUTHORITY)
@Schema(description = "接受入群申请传参")
public class GroupApplyAcceptReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "邀人的群成员")
    private Long fromUserId;

    @NotNull
    @CheckMark(target = CheckMark.Target.GROUP_ID)
    @Schema(description = "群组 id")
    private Long groupId;

    @Schema(description = "申请表 id")
    private Long applyId;
}
