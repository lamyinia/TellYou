package org.com.modules.user.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class SearchByUidResp {
    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(description = "被查询的 id")
    private Long userId;

    @Schema(description = "昵称")
    private String nickname;

    @Schema(description = "头像")
    private String avatar;

    @Schema(description = "性别 0:女 1:男")
    private Integer sex;

    @Schema(description = "个性签名")
    private String signature;
}
