package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "图片上传确认请求体")
public class PictureUploadConfirmReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromId;

    @Schema(description = "会话 id")
    private Long sessionId;

    @NotNull
    @Schema(description = "上传的图片 url")
    private String pictureUploadUrl;
}
