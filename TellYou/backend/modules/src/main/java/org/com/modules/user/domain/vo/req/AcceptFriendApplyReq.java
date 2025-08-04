package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.annotation.UnifyUid;

@Data
@Builder
@Unify
@AllArgsConstructor
@NoArgsConstructor
public class AcceptFriendApplyReq {
    @NotNull
    @UnifyUid
    @Schema(description = "发送者 id")
    private Long fromUid;

    @NotNull
    @Schema(description = "申请 id")
    private Long applyId;
}
