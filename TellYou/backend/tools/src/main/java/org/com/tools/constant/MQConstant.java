package org.com.tools.constant;


/**
 * @author lanye
 * @date 2025/07/27
 * @description 消息队列 topic 枚举类
 * @replenish 为选择不同 Tag 设置独立线程池，避免图片处理阻塞文字消息
 */
public interface MQConstant {
    /**
     * 单聊发送mq
     */
    String DELIVER_TOPIC = "deliver_msg";
    /**
     * 群聊发送
     */
    String PUBLISH_TOPIC = "publish_msg";

    String ACK_TOPIC = "ack_msg";

    String CONSUMER_GROUP = "chat-message-consumer-group";
}


