package org.com.tools.constant;

public interface MQConstant {
    /**
     * 单聊发送mq
     */
    String DELIVER_TOPIC = "deliver_msg";
    /**
     * 群聊发送
     */
    String PUBLISH_TOPIC = "publish_msg";

    String CONSUMER_GROUP = "chat-message-consumer-group";
}
