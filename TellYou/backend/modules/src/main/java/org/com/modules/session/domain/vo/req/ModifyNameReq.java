package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

@Data
@Schema(description = "改群名传参")
public class ModifyNameReq {
    @NotNull
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @Schema(description = "群 id")
    private Long groupId;

    @NotBlank
    @Length(max = 30)
    @Schema(description = "要改成的群名")
    private String name;
}
