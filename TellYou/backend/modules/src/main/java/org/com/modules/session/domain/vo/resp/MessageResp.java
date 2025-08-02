package org.com.modules.session.domain.vo.resp;

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

    private Long sessionId;

    private Long sequenceNumber;

    private String messageType;

    private Long senderId;

    private Long toUserId;

    private String content;

    private String adjustedTimestamp;

    private Boolean isRecalled;

    private Map<String, Object> extra;
}
