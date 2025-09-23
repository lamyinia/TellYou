package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@Builder
@CheckMark(target = CheckMark.Target.NORMAL)
public class DeleteContactReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "用户id")
    private Long userId;

    @NotNull
    @Schema(description = "联系人id")
    private Long contactId;
}
