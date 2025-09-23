package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

import java.util.List;

@Data
@CheckMark(target = CheckMark.Target.OWNER_AUTHORITY)
@Schema(description = "撤销")
public class WithdrawManagerReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "群主 id")
    private Long fromId;

    @NotNull
    @CheckMark(target = CheckMark.Target.GROUP_ID)
    @Schema(description = "群 id")
    private Long groupId;

    @NotNull
    @Schema(description = "目标 id")
    private List<Long> memberList;
}
