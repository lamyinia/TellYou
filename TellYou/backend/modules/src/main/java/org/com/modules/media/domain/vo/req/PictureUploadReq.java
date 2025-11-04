package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "图片上传请求体")
public class PictureUploadReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromUserId;

    @Schema(description = "目标 id")
    private Long targetId;

    @Schema(description = "单/群 聊类型")
    private Integer contactType;

    @Schema(description = "文件大小")
    private Long fileSize;

    @NotNull(message = "文件后缀不能为空")
    @Pattern(regexp = "^\\.(png|jpg|jpeg|gif|webp|avif)$",
            message = "图片文件格式只支持 .png, .jpg, .jpeg, .gif, .webp, .avif")
    @Schema(description = "文件后缀")
    private String fileSuffix;

}
