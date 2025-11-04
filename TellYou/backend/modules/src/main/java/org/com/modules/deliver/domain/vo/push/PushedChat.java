package org.com.modules.deliver.domain.vo.push;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.*;

import java.io.Serializable;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PushedChat implements Serializable {
    private String messageId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long sessionId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long sequenceNumber;

    private Integer messageType;
    /**
     * @see
     * org.com.modules.mail.domain.enums.MessageTypeEnum
     */

    @JsonSerialize(using = ToStringSerializer.class)
    private Long senderId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long receiverId;

    private String content;

    private String adjustedTimestamp;

    private Map<String, Object> extra;
}
