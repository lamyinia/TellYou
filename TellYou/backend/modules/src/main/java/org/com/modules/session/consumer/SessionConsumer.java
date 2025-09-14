package org.com.modules.session.consumer;

import com.alibaba.fastjson.JSON;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.session.service.ChatService;
import org.com.modules.session.domain.document.MessageDoc;
import org.com.modules.common.event.MessageSendEvent;
import org.com.modules.common.util.ApplicationContextProvider;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.modules.session.service.adapter.MessageAdapter;
import org.com.tools.constant.MQConstant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * @author: lanye
 * @date: 2025/07/27 20:28
 * @description 私聊消息的消费者
 * @replenish 在多人群聊中，精准投递的主要开销主要是在路由表的开销，但如果是单聊，必须精准投递
 * @主要业务逻辑：
 * 1) 信息持久化在信箱(mongodb)里面；
 * 2) 通知在线的用户；
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
   private final ApplicationEventPublisher applicationEventPublisher;
   private final MessageAdapter messageAdapter;
   private final ChatService chatService;

   @PostConstruct
   public void init() {
       log.info("SessionConsumer 已启动，监听主题: {}, 消费者组: {}",
           MQConstant.SESSION_TOPIC, MQConstant.SESSION_GROUP);
       log.info("RocketMQ配置 - NameServer: 127.0.0.1:9876");
   }

   @SneakyThrows
   @Override
   public void onMessage(String text) {
      MessageReq req = JSON.parseObject(text, MessageReq.class);
      Long uid = req.getFromUid();
      SessionConsumer proxy = (SessionConsumer) ApplicationContextProvider.currentProxy();
      proxy.consumeMessage(uid, req);
   }

//   @FlowControl(time = 10, count = 20, spEl = "#fromUid", target = FlowControl.Target.EL)
   public void consumeMessage(Long fromUid, MessageReq req){
      log.info("SessionConsumer 正在消费消息: {}", req.toString());

      MessageDoc messageDoc = messageAdapter.buildMessage(req);
      List<Long> uidList = getUidList(req);
      chatService.save(messageDoc, uidList);
      applicationEventPublisher.publishEvent(new MessageSendEvent(this, messageDoc, uidList));
   }

   private List<Long> getUidList(MessageReq req) {
      if (req.getToUserId() < 0) return null;
      else return List.of(req.getFromUid(), req.getToUserId());
   }
}
