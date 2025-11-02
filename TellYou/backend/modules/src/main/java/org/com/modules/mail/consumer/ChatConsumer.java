package org.com.modules.mail.consumer;

import cn.hutool.core.util.ArrayUtil;
import com.alibaba.fastjson.JSON;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.util.ApplicationContextProvider;
import org.com.modules.deliver.event.ChatSendEvent;
import org.com.modules.group.service.adapter.MessageAdapter;
import org.com.modules.mail.cache.VerifyService;
import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.modules.mail.service.MailBoxService;
import org.com.tools.constant.MQConstant;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

/**
 * 聊天室消息消费者。在多人群聊中，精准投递的主要开销主要是在路由表的开销，但如果是单聊，必须精准投递
 * @业务逻辑
 * 1) 信息持久化在信箱(mongodb)；2) 通知在线的用户；3）多人群聊中，由于精准投递中写扩散中查路由表的开销很大，
 * 在节点不多的情况下，可以采取集群广播的方式(如果节点很多，当然也可以混合路由去优化)
 * @author lanye
 * @since 2025/07/27 20:28
 */

@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(
        topic = MQConstant.SESSION_TOPIC,
        consumerGroup = MQConstant.SESSION_GROUP,
        consumeMode = org.apache.rocketmq.spring.annotation.ConsumeMode.CONCURRENTLY,
        maxReconsumeTimes = 3
)
public class ChatConsumer implements RocketMQListener<String> {
    private final ApplicationEventPublisher applicationEventPublisher;
    private final MessageAdapter messageAdapter;
    private final MailBoxService mailBoxService;
    private final VerifyService verifyService;

    public static final Integer[] needGroup = {21, 22, 23, 24, 25, 51, 52, 53, 54, 55};
    public static final Integer[] noControl = {51, 52, 53, 54, 55};
    /**
     * @see
     * org.com.modules.mail.domain.enums.MessageTypeEnum
     */

    @PostConstruct
    public void init() {
        log.info("ChatConsumer 已启动，监听主题: {}, 消费者组: {}",
                MQConstant.SESSION_TOPIC, MQConstant.SESSION_GROUP);
        log.info("RocketMQ配置 - NameServer: 127.0.0.1:9876");
    }

    @SneakyThrows
    @Override
    public void onMessage(String text) {
        ChatDTO req = JSON.parseObject(text, ChatDTO.class);
        ChatConsumer proxy = (ChatConsumer) ApplicationContextProvider.currentProxy();
        if (ArrayUtil.contains(noControl, req.getType())){
            this.consumeMessage(req);  // 不需要限流
        } else {
            proxy.consumeMessage(req);
        }
    }

    @FlowControl(time = 10, count = 100, spEl = "#req.fromUserId", target = FlowControl.Target.EL)
    public void consumeMessage(ChatDTO req) {
        log.info("ChatConsumer 正在消费消息: {}", req.toString());

        List<Long> uidList = getUidList(req);
        MessageDoc messageDoc = messageAdapter.buildMessage(req);
        mailBoxService.insertChatMessage(messageDoc, uidList);
        applicationEventPublisher.publishEvent(new ChatSendEvent(this, messageDoc, uidList));
    }

    /**
     * 用户发消息，校验用户对会话的权限，如果非法，发布异步事件通知客户端
     */
    private List<Long> getUidList(ChatDTO req) {
        if (ArrayUtil.contains(needGroup, req.getType())) {
            Set<Long> groupMembers = verifyService.getGroupMembers(req.getTargetId());
            if (groupMembers == null || groupMembers.isEmpty()) {
                return List.of();
            }

            return groupMembers.stream().toList();
        } else {
            return List.of(req.getFromUserId(), req.getTargetId());
        }
    }
}
