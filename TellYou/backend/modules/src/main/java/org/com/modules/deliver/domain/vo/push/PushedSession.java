package org.com.modules.deliver.domain.vo.push;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PushedSession {
    @Schema(description = "会话 id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long sessionId;

    @Schema(description = "对象 id (用户id、群id)")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long contactId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long receiverId;

    /**
     * @see org.com.modules.contact.domain.enums.SessionEventEnum
     */
    @Schema(description = "改变类型")
    private Integer metaSessionType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long ackId;
}
