package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.com.modules.common.annotation.UnifyMark;
import org.hibernate.validator.constraints.Length;

@Data
@Builder
@AllArgsConstructor
@ToString
@UnifyMark(target = UnifyMark.Target.NORMAL)
public class FriendApplyReq {
    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "申请信息")
    private Long fromUid;

    @NotNull
    @Schema(description = "申请的接收者")
    private Long contactId;

    @NotBlank
    @Length(max = 100)
    @Schema(description = "申请信息")
    private String description;
}
