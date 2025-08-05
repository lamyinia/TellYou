package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.annotation.UnifyUid;

@Data
@Builder
@Unify
public class DeleteContactReq {
    @UnifyUid
    @NotNull
    @Schema(description = "用户id")
    private Long userId;

    @NotNull
    @Schema(description = "联系人id")
    private Long contactId;
}
