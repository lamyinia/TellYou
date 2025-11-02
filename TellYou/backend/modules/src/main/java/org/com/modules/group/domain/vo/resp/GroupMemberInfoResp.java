package org.com.modules.group.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 群成员基本信息响应（分页查询用）
 * 包含成员ID和角色，头像和昵称需要前端通过批量接口获取
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "群成员基本信息（分页）")
public class GroupMemberInfoResp {
    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(description = "用户ID")
    private Long userId;

    @Schema(description = "角色：0=普通成员, 1=成员, 2=管理员, 3=群主")
    private Integer role;
}

