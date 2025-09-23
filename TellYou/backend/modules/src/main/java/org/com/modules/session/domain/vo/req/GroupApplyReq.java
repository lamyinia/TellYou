package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;
import org.hibernate.validator.constraints.Length;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "申请入群")
public class GroupApplyReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "申请入群者 id")
    private Long fromId;

    @NotNull
    @Schema(description = "群组 id")
    private Long groupId;

    @NotBlank
    @Length(max = 100)
    @Schema(description = "申请信息")
    private String description;
}
