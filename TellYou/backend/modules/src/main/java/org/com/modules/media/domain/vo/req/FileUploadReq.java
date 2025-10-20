package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "文件上传请求体")
public class FileUploadReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromId;

    @Schema(description = "会话 id")
    private Long sessionId;

    @Schema(description = "文件大小")
    private Long fileSize;

    @NotNull(message = "文件后缀不能为空")
    @Pattern(regexp = "^\\.(png|jpg|jpeg|gif|webp)$",
            message = "头像文件格式只支持 .png, .jpg, .jpeg, .gif, .webp")
    @Schema(description = "文件后缀")
    private String fileSuffix;
}
