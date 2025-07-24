//package org.com.modules.chat.consumer;
//
//import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
//import org.apache.rocketmq.spring.core.RocketMQListener;
//import org.com.modules.chat.domain.dto.ChatMessageDTO;
//import org.com.tools.constant.MQConstant;
//import org.springframework.stereotype.Service;
//
//@Service
//@RocketMQMessageListener(topic = MQConstant.SEND_MSG_TOPIC, consumerGroup = MQConstant.CONSUMER_GROUP)
//public class PrivateSessionConsumer implements RocketMQListener<ChatMessageDTO> {
//   @Override
//   public void onMessage(ChatMessageDTO chatMessageDTO) {
//
//   }
//}
