package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;

@Data
@Builder
@AllArgsConstructor
@ToString
public class FriendApplyReq {
    @NotBlank
    @Schema(description = "申请信息")
    private String description;

    @NotNull
    @Schema(description = "申请的接收者")
    private Long contactId;
}
