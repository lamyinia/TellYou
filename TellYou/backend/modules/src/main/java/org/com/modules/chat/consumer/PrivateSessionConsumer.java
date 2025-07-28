package org.com.modules.chat.consumer;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.chat.domain.document.MessageMailBox;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.modules.chat.utils.MessageConvertUtil;
import org.com.tools.constant.MQConstant;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * @author: lanye
 * @date: 2025/07/27 20:28
 * @description 私聊消息的消费者
 * @replenish 在多人群聊中，精准投递的主要开销主要是在路由表的开销，但如果是单聊，必须精准投递
 * @主要业务逻辑：
 * @(1) 信息持久化在信箱(mongodb)里面
 * @(2) 通知在线的用户
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(
    topic = MQConstant.DELIVER_TOPIC,
    consumerGroup = MQConstant.CONSUMER_GROUP,
    consumeMode = org.apache.rocketmq.spring.annotation.ConsumeMode.CONCURRENTLY
)
public class PrivateSessionConsumer implements RocketMQListener<MessageDTO> {
   private final RedissonClient redissonClient;
   private final MessageConvertUtil messageConvertUtil;

   @PostConstruct
   public void init() {
       log.info("PrivateSessionConsumer 已启动，监听主题: {}, 消费者组: {}", 
           MQConstant.DELIVER_TOPIC, MQConstant.CONSUMER_GROUP);
       log.info("RocketMQ配置 - NameServer: 127.0.0.1:9876");
   }

   @Override
   public void onMessage(MessageDTO dto) {
      log.info("PrivateSessionConsumer 正在消费消息: {}", dto.toString());
      log.info("消息时间戳: {}, 当前时间: {}", dto.getTimestamp(), System.currentTimeMillis());
      System.out.println(new Date());

      MessageMailBox document = messageConvertUtil.covertToDocumentAndSave(dto);

//      String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(dto.getToUserId());
//      if (node != null){
//         redissonClient.getTopic(node).publish(document);
//      }

   }
}
