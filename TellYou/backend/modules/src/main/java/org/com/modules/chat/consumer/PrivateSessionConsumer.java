package org.com.modules.chat.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.modules.chat.service.MessageMailBoxService;
import org.com.tools.common.SubscribedItem;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.RedissonConstant;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MQConstant.DELIVER_TOPIC, consumerGroup = MQConstant.CONSUMER_GROUP)
public class PrivateSessionConsumer implements RocketMQListener<MessageDTO> {
   private final RedissonClient redissonClient;
   private final MessageMailBoxService messageMailBoxService;

   @Override
   public void onMessage(MessageDTO dto) {
      log.info("PrivateSessionConsumer 正在消费消息: {}", dto.toString());

      String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(Long.parseLong(dto.getToUserId()));
      if (node != null){
         SubscribedItem subscribedItem = new SubscribedItem(Collections.singletonList(Long.parseLong(dto.getToUserId())), dto);
         redissonClient.getTopic(node).publish(subscribedItem);
      } else {

         log.info("用户:{} 下线", dto.getToUserId());
      }

   }
}
