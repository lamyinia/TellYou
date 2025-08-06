package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.com.modules.common.annotation.UnifyMark;

import java.util.List;

// TODO 不同群成员的邀人上限不同

@Data
@UnifyMark(target = UnifyMark.Target.MEMBER_AUTHORITY)
@Schema(description = "邀人传参")
public class InviteFriendReq {
    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "邀人的群成员")
    private Long fromId;

    @NotNull
    @UnifyMark(target = UnifyMark.Target.GROUP_ID)
    @Schema(description = "群组 id")
    private Long groupId;

    @NotNull
    @Size(min = 1, max = 100)
    @Schema(description = "要邀的对象")
    private List<Long> targetList;
}
