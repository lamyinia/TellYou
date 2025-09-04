package org.com.modules.user.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;

@Data
@AllArgsConstructor
@Schema(description = "登录响应")
public class LoginResp implements Serializable {
    @Schema(description = "jwt 权限校验标识")
    private String token;

    @Schema(description = "前端本地数据库标识")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long uid;
}
