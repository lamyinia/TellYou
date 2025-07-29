package org.com.tools.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
@AllArgsConstructor
@Schema(description = "节点订阅 redisson 的信息")
public class SubscribedItem implements Serializable {
    @Schema(description = "需要投递的 uid")
    public Long uId;
    @Schema (description = "回推的 message")
    public Object message;
}
