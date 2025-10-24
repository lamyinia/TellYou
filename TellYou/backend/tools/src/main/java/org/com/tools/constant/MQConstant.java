package org.com.tools.constant;


/**
 * @author lanye
 * @date 2025/07/27
 * @description 消息队列 topic 枚举类
 */
public class MQConstant {
    /**
     * 单聊和群聊的信息 topic
     */
    public static final String SESSION_TOPIC = "session_msg";
    public static final String BROADCAST_TOPIC = "broadcast_msg";
    public static final String ACK_TOPIC = "ack_msg";
    public static final String AGGREGATE_TOPIC = "aggregate_msg";

    public static final String SESSION_GROUP = "session-chat-consumer-group";
    public static final String BROADCAST_GROUP = "group-chat-consumer-group";
    public static final String ACK_MANAGER_GROUP = "chat-ack-consumer-group";
    public static final String AGGREGATE_MANAGER_GROUP = "aggregate-consumer-group";
}


