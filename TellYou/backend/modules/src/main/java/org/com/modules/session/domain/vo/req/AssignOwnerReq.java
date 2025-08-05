package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "指定群主传参")
public class AssignOwnerReq {

    @NotNull
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @Schema(description = "群 id")
    private Long groupId;

    @NotNull
    @Schema(description = "指定群主 id")
    private Long memberId;
}
