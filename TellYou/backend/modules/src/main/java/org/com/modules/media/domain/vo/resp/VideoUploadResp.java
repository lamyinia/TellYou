package org.com.modules.media.domain.vo.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@Schema(description = "视频上传响应体")
public class VideoUploadResp {
    @Schema(description = "视频上传URL")
    private String uploadUrl;

    @Schema(description = "缩略图上传URL")
    private String thumbnailUploadUrl;
}
