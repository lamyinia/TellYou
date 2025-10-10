package org.com.modules.session.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactResp {
    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(description = "会话id")
    private Long sessionId;

    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(description = "目标id")
    private Long contactId;

    @Schema(description = "会话角色")
    private Integer role;

    @Schema(description = "会话类型")
    private Integer sessionType;
}
