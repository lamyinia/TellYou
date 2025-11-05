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
    private Long fromUserId;

    @Schema(description = "目标 id")
    private Long targetId;

    @Schema(description = "联系类型")
    private Integer contactType;

    @Schema(description = "文件大小")
    private Long fileSize;

    @Schema(description = "文件名")
    private String fileName;

    @NotNull(message = "文件后缀不能为空")
    @Pattern(regexp = "^\\.(png|jpg|jpeg|gif|webp|mp4|mp3|zip|rar|pdf|ppt|pptx|doc|docx|xls|xlsx|txt|csv|json|xml|html|css|js|java|py|js|c|cc|cpp|cs|go|rs|rb|rbx)$",
            message = "文件格式只支持 .png, .jpg, .jpeg, .gif, .webp, .mp4, .mp3, .zip, .rar")
    @Schema(description = "文件后缀")
    private String fileSuffix;
}
