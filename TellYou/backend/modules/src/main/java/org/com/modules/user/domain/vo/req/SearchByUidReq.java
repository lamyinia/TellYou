package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
public class SearchByUidReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发起者 id")
    private Long fromId;

    @NotNull
    @Schema(description = "被查询的 id")
    private Long searchedId;
}
