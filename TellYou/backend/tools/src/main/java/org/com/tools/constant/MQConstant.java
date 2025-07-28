package org.com.tools.constant;


/**
 * @author lanye
 * @date 2025/07/27
 * @description 消息队列 topic 枚举类
 * @replenish 为选择不同 Tag 设置独立线程池，避免图片处理阻塞文字消息
 */
public class MQConstant {
    /**
     * 单聊发送mq
     */
    public static final String DELIVER_TOPIC = "deliver_msg";
    /**
     * 群聊发送
     */
    public static final String PUBLISH_TOPIC = "publish_msg";

    public static final String ACK_TOPIC = "ack_msg";

    public static final String CONSUMER_GROUP = "chat-message-consumer-group";
    public static final String ACK_CONSUMER_GROUP = "chat-ack-consumer-group";
}


