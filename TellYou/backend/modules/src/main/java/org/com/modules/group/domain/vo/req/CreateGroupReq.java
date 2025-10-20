package org.com.modules.group.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;
import org.hibernate.validator.constraints.Length;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "创建群组传参")
public class CreateGroupReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "群主")
    private Long fromUid;

    @NotBlank
    @Length(max = 30)
    @Schema(description = "新群名称")
    private String name;
}
