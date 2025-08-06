package org.com.modules.session.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.com.modules.common.annotation.UnifyMark;

@Data
@UnifyMark(target = UnifyMark.Target.MEMBER_AUTHORITY)
@Schema(description = "禁言")
public class BanChatReq {
}
