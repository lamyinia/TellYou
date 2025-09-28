package org.com.modules.common.domain.vo.req;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AvatarUploadReq {
    @NotNull(message = "头像大小不能为空")
    @Max(value = 10 * 1024 * 1024, message = "头像大小不能超过10MB")
    private Long fileSize;

    @NotNull(message = "文件后缀不能为空")
    @Pattern(regexp = "^\\.(png|jpg|jpeg|gif|webp|avif)$",
             message = "头像文件格式只支持 .png, .jpg, .jpeg, .gif, .webp, .avif")
    private String fileSuffix;
}
