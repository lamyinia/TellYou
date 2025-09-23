package org.com.modules.user.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.io.Serializable;

@Data
@Builder
@Schema(description = "登录响应")
public class LoginResp implements Serializable {
    @Schema(description = "前端本地数据库标识")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long uid;

    @Schema(description = "jwt 权限校验标识")
    private String token;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "剩余昵称改名次数")
    private Integer nicknameResidue;

    @Schema(description = "性别")
    private String sex;

    @Schema(description = "剩余性别改名次数")
    private Integer sexResidue;

    @Schema(description = "签名")
    private String signature;

    @Schema(description = "剩余签名改名次数")
    private Integer signatureResidue;

    @Schema(description = "头像url")
    private String avatarUrl;

    @Schema(description = "剩余头像更换次数")
    private Integer avatarResidue;
}
