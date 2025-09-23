package org.com.modules.common.domain.vo.req;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.com.modules.common.annotation.CheckMark;

@Data
@CheckMark(target = CheckMark.Target.NORMAL)
public class AvatarUploadConfirmReq {
    @NotNull
    @CheckMark(target = CheckMark.Target.USER_ID)
    private Long fromId;

    @NotNull
    private String originalUploadUrl;

    @NotNull
    private String thumbnailUploadUrl;
}
