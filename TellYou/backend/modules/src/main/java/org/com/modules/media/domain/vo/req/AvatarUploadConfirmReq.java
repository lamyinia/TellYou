package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "头像上传确认请求体")
public class AvatarUploadConfirmReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromId;

    @NotNull
    @Schema(description = "原图 url")
    private String originalUploadUrl;

    @NotNull
    @Schema(description = "缩略图 url")
    private String thumbnailUploadUrl;
}
