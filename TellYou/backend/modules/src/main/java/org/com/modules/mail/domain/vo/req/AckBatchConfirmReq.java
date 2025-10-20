package org.com.modules.mail.domain.vo.req;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "ack 批量确认")
public class AckBatchConfirmReq {
    @Schema(description = "确认名单")
    private List<String> messageIdList;
}
