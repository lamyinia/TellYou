package org.com.modules.session.domain.vo.resp;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.swagger.v3.oas.annotations.media.Schema;
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

    @Schema(description="消息类型：1文本 2图片 3语音 4视频 5文件 6红包")
    private Integer messageType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long senderId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long toUserId;

    private String content;

    private String adjustedTimestamp;

    private Map<String, Object> extra;
}
