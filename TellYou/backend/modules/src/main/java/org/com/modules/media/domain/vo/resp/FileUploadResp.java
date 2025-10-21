package org.com.modules.media.domain.vo.resp;

import lombok.AllArgsConstructor;
import io.swagger.v3.oas.annotations.media.Schema;

@AllArgsConstructor
@Schema(description = "文件上传响应体")
public class FileUploadResp {
    
    @Schema(description = "文件上传URL")
    private String uploadUrl;
}
