package org.com.modules.common.service.dispatch;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.com.modules.session.domain.vo.resp.MessageResp;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
@Schema(description = "节点订阅 redisson 的信息")
public class SubscribedItem implements Serializable {
    @Schema(description = "需要投递的 uid")
    public List<Long> uidList;
    @Schema (description = "回推的 message")
    public MessageResp vo;
}
