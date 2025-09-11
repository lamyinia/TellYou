package org.com.modules.session.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Field;

import java.io.Serializable;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class MessageResp implements Serializable {
    private String messageId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long sessionId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long sequenceNumber;

    private Integer messageType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long senderId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long toUserId;

    private String content;

    private String adjustedTimestamp;

    private Map<String, Object> extra;
}
