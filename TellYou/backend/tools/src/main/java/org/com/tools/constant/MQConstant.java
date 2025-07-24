package org.com.tools.constant;

public interface MQConstant {
    /**
     * 单聊发送mq
     */
    String SEND_MSG_TOPIC = "chat_send_msg";
    /**
     * 群聊发送
     */
    String PUSH_TOPIC = "websocket_push";

    String CONSUMER_GROUP = "chat-message-consumer-group";
}
