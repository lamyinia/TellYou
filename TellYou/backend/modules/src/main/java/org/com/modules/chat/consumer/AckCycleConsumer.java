package org.com.modules.chat.consumer;


import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.tools.constant.MQConstant;
import org.springframework.stereotype.Service;

/**
 * @author lanye
 * @date 2025/07/27
 * @description ack整个生命周期的处理机制，兜底 ack 发送失败的情况
 */
@Slf4j
@Service
@RocketMQMessageListener(topic = MQConstant.ACK_TOPIC, consumerGroup = MQConstant.CONSUMER_GROUP)
public class AckCycleConsumer implements RocketMQListener<MessageDTO> {

    @Override
    public void onMessage(MessageDTO messageDTO) {

    }

}
