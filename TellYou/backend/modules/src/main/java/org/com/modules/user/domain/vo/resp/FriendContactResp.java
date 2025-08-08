package org.com.modules.user.domain.vo.resp;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "联系人分页返回")
public class FriendContactResp {
    @Schema(description = "联系人 id")
    private Long contactId;
}
