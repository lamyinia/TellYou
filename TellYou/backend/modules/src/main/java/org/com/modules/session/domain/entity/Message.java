package org.com.modules.session.domain.entity;


import java.util.Date;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class Message {
    @Schema(description="会话id")
    private Long sessionId;

    @Schema(description="会话内自增id")
    private Long sequenceId;

    @Schema(description="发送者uid")
    private Long senderId;

    @Schema(description="时序性id")
    private String adjustedTimestamp;

    @Schema(description="消息类型：1文本 2图片 3语音 4视频 5文件 6红包")
    private Integer msgType;

    @Schema(description="是否撤回")
    private Integer isRecalled;

    @Schema(description="基本展示内容")
    private String text;

    @Schema(description="额外信息")
    private Object extJson;

    @Schema(description="发送时间（毫秒精度）")
    private Date sendTime;

}
