package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "语音上传请求体")
public class VoiceUploadReq {
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
    @Pattern(regexp = "^\\.(mp3|wav|ogg)$",
            message = "语音文件格式只支持 .mp3, .wav, .ogg")
    @Schema(description = "文件后缀")
    private String fileSuffix;

    @NotNull(message = "语音时长不能为空")
    @Min(value = 1, message = "语音时长至少1秒")
    @Max(value = 60, message = "语音时长不能超过60秒")
    @Schema(description = "语音时长（秒）")
    private Integer duration;
}
