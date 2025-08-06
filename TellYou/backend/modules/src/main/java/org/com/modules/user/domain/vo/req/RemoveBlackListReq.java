package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.com.modules.common.annotation.UnifyMark;

@Data
@Builder
@AllArgsConstructor
@ToString
@UnifyMark(target = UnifyMark.Target.NORMAL)
public class RemoveBlackListReq {

    @NotNull
    @UnifyMark(target = UnifyMark.Target.USER_ID)
    @Schema(description = "发起者 id")
    private Long fromId;

    @NotNull
    @Schema(description = "黑名单 id")
    private Long blackId;
}
