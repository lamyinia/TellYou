package org.com.modules.mail.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.com.tools.constant.MQConstant;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@AllArgsConstructor
public enum MessageTypeEnum {
    HEARTBEAT(0, "HEARTBEAT", ""),
    PRIVATE_TEXT(1, MQConstant.SESSION_TOPIC, "单聊文本"),
    PRIVATE_IMAGE(2, MQConstant.SESSION_TOPIC, "单聊图片"),
    PRIVATE_VIDEO(3, MQConstant.SESSION_TOPIC, "单聊视频"),
    PRIVATE_VOICE(4, MQConstant.SESSION_TOPIC, "单聊语音"),
    PRIVATE_FILE(5, MQConstant.SESSION_TOPIC, "单聊文件"),

    GROUP_TEXT(6, MQConstant.SESSION_TOPIC, "群聊文本"),
    GROUP_IMAGE(7, MQConstant.SESSION_TOPIC, "群聊图片"),
    GROUP_VIDEO(8, MQConstant.SESSION_TOPIC, "群聊视频"),
    GROUP_VOICE(9, MQConstant.SESSION_TOPIC, "群聊语音"),
    GROUP_FILE(10, MQConstant.SESSION_TOPIC, "群聊文件"),
    SYSTEM_ENTER_NOTIFY(51, MQConstant.SESSION_TOPIC, "群聊系统通知入群"),
    SYSTEM_EXIT_NOTIFY(52, MQConstant.SESSION_TOPIC, "群聊系统通知退群"),

    CHAT_ACK_CONFIRM(101, MQConstant.ACK_TOPIC, "-message"),
    APPLICATION_ACK_CONFIRM(102, MQConstant.ACK_TOPIC, "-apply"),
    SESSION_ACK_CONFIRM(103, MQConstant.ACK_TOPIC, "-session"),
    BEHAVIOUR_ACK_CONFIRM(104, MQConstant.ACK_TOPIC, "-behaviour");


    private final Integer type;
    private final String topic;
    private final String desc;

    private static Map<Integer, MessageTypeEnum> cache;

    static {
        cache = Arrays.stream(MessageTypeEnum.values())
                .collect(Collectors.toMap(MessageTypeEnum::getType, Function.identity()));
    }

    public static MessageTypeEnum of(Integer type) {
        return cache.get(type);
    }

}
