package org.com.modules.media.domain.vo.resp;

import lombok.AllArgsConstructor;
import lombok.Data;
import io.swagger.v3.oas.annotations.media.Schema;

@Data
@AllArgsConstructor
@Schema(description = "语音上传预签名URL响应")
public class VoiceUploadResp {
    @Schema(description = "上传预签名URL")
    private String uploadUrl;
}
