package org.com.modules.deliver.domain.vo.push;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Map;


/**
 * 强制消息推送实体，如强制下线、撤回消息
 * @author lanye
 * @since 2025/11/01 14:02
 */

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class PushedCommand {
    private Integer commandType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long receiverId;

    private Map<String, Object> extra;
}
