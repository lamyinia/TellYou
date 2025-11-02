package org.com.modules.group.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "可邀请好友信息")
public class InvitableFriendResp {
    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(description = "用户ID")
    private Long userId;
}

