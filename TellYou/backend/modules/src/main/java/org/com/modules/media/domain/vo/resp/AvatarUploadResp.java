package org.com.modules.media.domain.vo.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@Schema(description = "头像上传预签名URL响应")
public class AvatarUploadResp {
    @Schema(description = "原图上传预签名URL")
    private String originalUploadUrl;

    @Schema(description = "缩略图上传预签名URL")
    private String thumbnailUploadUrl;
}
