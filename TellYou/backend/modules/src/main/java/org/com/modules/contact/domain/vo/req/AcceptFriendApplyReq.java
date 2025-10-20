package org.com.modules.contact.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.com.modules.common.annotation.CheckMark;

@Data
@Builder
@CheckMark(target = CheckMark.Target.NORMAL)
@AllArgsConstructor
@NoArgsConstructor
public class AcceptFriendApplyReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromUserId;

    @NotNull
    @Schema(description = "申请 id")
    private Long applyId;
}
