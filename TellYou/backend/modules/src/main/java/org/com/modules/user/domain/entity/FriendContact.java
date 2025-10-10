package org.com.modules.user.domain.entity;


import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FriendContact {
    @Schema(description = "用户id")
    private Long userId;

    @Schema(description = "联系人id")
    private Long contactId;

    @Schema(description = "会话id")
    private Long sessionId;

    @Schema(description = "1 = 好友, 2 = 有一方删除, 3 = 黑名单处理且互相不是好友, 4 = 黑名单但互相是好友(解除黑名单会回到好友关系)")
    private Integer status;

    @Schema(description = "创建时间")
    private Date createdAt;

    @Schema(description = "更新时间")
    private Date updatedAt;

    @Schema(description = "0 = 好友, 1 = 删除或者黑名单")
    private Integer isDeleted;

    @Schema(description = "关系版本号")
    private Integer version;
}
