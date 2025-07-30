package org.com.modules.session.consumer;

import com.alibaba.fastjson.JSON;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.session.domain.document.MessageMailBox;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.modules.session.domain.vo.resp.MessageResp;

import org.com.modules.session.utils.MessageConvertUtil;
import org.com.modules.session.subscriber.SubscribedItem;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.RedissonConstant;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

/**
 * @author: lanye
 * @date: 2025/07/27 20:28
 * @description 私聊消息的消费者
 * @replenish 在多人群聊中，精准投递的主要开销主要是在路由表的开销，但如果是单聊，必须精准投递
 * @主要业务逻辑：
 * @(1) 信息持久化在信箱(mongodb)里面
 * @(2) 通知在线的用户
 * @----------
 * @description 群聊消息的消费者
 * @replenish 多人群聊中，由于精准投递中写扩散中查路由表的开销很大，在节点不多的情况下，可以采取集群广播的方式(如果节点很多，当然也可以混合路由去优化)
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(
    topic = MQConstant.SESSION_TOPIC,
    consumerGroup = MQConstant.SESSION_GROUP,
    consumeMode = org.apache.rocketmq.spring.annotation.ConsumeMode.CONCURRENTLY
)
public class SessionConsumer implements RocketMQListener<String> {
   private final RedissonClient redissonClient;
   private final MessageConvertUtil messageConvertUtil;
   private final RocketMQTemplate rocketMQTemplate;

   @PostConstruct
   public void init() {
       log.info("SessionConsumer 已启动，监听主题: {}, 消费者组: {}",
           MQConstant.SESSION_TOPIC, MQConstant.SESSION_GROUP);
       log.info("RocketMQ配置 - NameServer: 127.0.0.1:9876");
   }

   @Override
   public void onMessage(String text) {
      MessageReq dto = null;
      try {
         dto = JSON.parseObject(text, MessageReq.class);
      } catch (Exception e){
         log.warn("前端JSON错误 {}", e.getMessage());
      }
      if (dto == null){
         return;
      }

      log.info("SessionConsumer 正在消费消息: {}", dto.toString());
      System.out.println(new Date());

      MessageMailBox document = messageConvertUtil.covertToDocumentAndSave(dto);

      List<Long> toUserIds = document.getToUserIds();

      if (toUserIds.size() < 5){
         document.getToUserIds().forEach(uid -> {
            String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
            if (node != null){
               redissonClient.getTopic(node).publish(document);
            }
         });
      } else {
         MessageResp vo = new MessageResp();
         BeanUtils.copyProperties(dto, vo);

         rocketMQTemplate.convertAndSend(MQConstant.GROUP_TOPIC, new SubscribedItem(document.getToUserIds(), vo));
      }
   }
}
