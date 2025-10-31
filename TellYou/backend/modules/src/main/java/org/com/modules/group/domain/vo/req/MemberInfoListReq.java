package org.com.modules.group.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;
import org.com.modules.common.domain.vo.req.PageReq;

@Data
@CheckMark(target = CheckMark.Target.MEMBER_AUTHORITY)
@Schema(description = "群成员信息获取")
public class MemberInfoListReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "群成员 id")
    private Long fromUserId;

    @NotNull
    @CheckMark(target = CheckMark.Target.GROUP_ID)
    @Schema(description = "群组 id")
    private Long groupId;

    private PageReq pageReq;
}
