package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.com.modules.common.annotation.UnifyMark;

@Data
@Builder
@UnifyMark(target = UnifyMark.Target.NORMAL)
@AllArgsConstructor
@NoArgsConstructor
public class AcceptFriendApplyReq {
    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromUid;

    @NotNull
    @Schema(description = "申请 id")
    private Long applyId;
}
