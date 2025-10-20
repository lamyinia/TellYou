package org.com.modules.group.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;
import org.hibernate.validator.constraints.Length;

@Data
@CheckMark(target = CheckMark.Target.OWNER_AUTHORITY)
@Schema(description = "修改群卡片")
public class ModifyCardReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @CheckMark(target = CheckMark.Target.GROUP_ID)
    @Schema(description = "群组 id")
    private Long groupId;

    @NotBlank
    @Length(max = 50)
    @Schema(description = "要改成的群卡片")
    private String card;
}
