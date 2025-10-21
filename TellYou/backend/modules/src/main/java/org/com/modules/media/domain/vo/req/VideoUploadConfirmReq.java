package org.com.modules.media.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "视频上传确认请求体")
public class VideoUploadConfirmReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发送者 id")
    private Long fromUserId;

    @Schema(description = "目标 id")
    private Long targetId;

    @Schema(description = "联系类型")
    private Integer contactType;

    @Schema(description = "会话 id")
    private Long sessionId;

    @NotNull
    @Schema(description = "上传的视频 url")
    private String fileObject;

    @NotNull
    @Schema(description = "上传的视频缩略图 url")
    private String thumbnailObject;
}
