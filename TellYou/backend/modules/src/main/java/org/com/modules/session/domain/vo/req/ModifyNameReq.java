package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.UnifyMark;
import org.hibernate.validator.constraints.Length;

@Data
@UnifyMark(target = UnifyMark.Target.OWNER_AUTHORITY)
@Schema(description = "改群名传参")
public class ModifyNameReq {
    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @UnifyMark(target = UnifyMark.Target.GROUP_ID)
    @Schema(description = "群组 id")
    private Long groupId;

    @NotBlank
    @Length(max = 30)
    @Schema(description = "要改成的群名")
    private String name;
}
