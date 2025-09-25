package org.com.modules.user.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
@Schema(description = "修改名字请求")
public class ModifyNicknameReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    @Schema(description = "发起者 id")
    private Long fromUid;

    @Schema(description = "新名字")
    private String newNickname;
}
