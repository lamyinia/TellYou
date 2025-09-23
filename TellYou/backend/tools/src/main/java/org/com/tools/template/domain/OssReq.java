package org.com.tools.template.domain;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Description: 上传url请求入参
 * Author: <a href="https://github.com/zongzibinbin">abin</a>
 * Date: 2023-03-23
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OssReq {
    @Schema(description = "文件存储路径")
    private String filePath;

    @Schema(description = "文件名")
    private String fileName;

    @Schema(description = "请求的uid")
    private Long uid;

    @Schema(description = "自动生成地址")
    @Builder.Default
    private boolean autoPath = true;

}
