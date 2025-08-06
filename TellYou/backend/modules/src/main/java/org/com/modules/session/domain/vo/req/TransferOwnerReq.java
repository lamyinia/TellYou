package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.UnifyMark;

@Data
@UnifyMark(target = UnifyMark.Target.OWNER_AUTHORITY)
@Schema(description = "转让群主")
public class TransferOwnerReq {
    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @UnifyMark(target = UnifyMark.Target.GROUP_ID)
    @Schema(description = "群 id")
    private Long groupId;

    @NotNull
    @Schema(description = "目标 id")
    private Long memberId;
}
