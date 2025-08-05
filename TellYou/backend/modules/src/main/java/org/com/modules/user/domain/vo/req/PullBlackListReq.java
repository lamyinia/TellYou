package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.annotation.UnifyUid;

@Data
@Builder
@AllArgsConstructor
@ToString
@Unify
public class PullBlackListReq {
    @NotNull
    @UnifyUid
    @Schema(description = "发起者 id")
    private Long fromId;

    @NotNull
    @Schema(description = "发起者类型")
    private Integer fromType;

    @NotNull
    @Schema(description = "被拉进黑名单者 id")
    private Long targetId;

}
