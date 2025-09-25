package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;
import org.hibernate.validator.constraints.Length;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "签名修改请求 id")
public class ModifySignatureReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发起者 id")
    private Long fromUid;

    @NotBlank
    @Length(max = 50, message = "签名长度不能超过 50")
    @Schema(description = "新签名")
    private String newSignature;
}
