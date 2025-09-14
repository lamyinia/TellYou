package org.com.modules.session.consumer;


import com.alibaba.fastjson.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.common.service.retry.MessageDelayQueue;
import org.com.modules.session.dao.UserInBoxDocDao;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.tools.constant.MQConstant;
import org.springframework.stereotype.Service;

/**
 * ACK 生命周期消费端。
 *
 * 职责：
 * 1) 兜底处理 ACK 未达场景，确保“服务端推送 -> 客户端确认”的闭环；
 * 2) 客户端未收到 ACK 的自发消息会进入“待确认队列”，定时重拉直至确认；
 * 3) 客户端离线期间的消息，上线后需从“信箱/离线存储”补拉未确认记录；
 * 4) 服务端对所有下行消息需最终获得客户端的 ACK 状态（成功/超时/失败）。
 *
 * 语义说明：
 * - 至少一次投递，消费端需保证幂等；
 * - 建议基于消息唯一键（如 messageId）进行去重；
 * - 可结合重试/死信队列监控异常并做告警。
 *
 * 消费配置：topic = MQConstant.ACK_TOPIC, group = MQConstant.ACK_MANAGER_GROUP
 *
 * @author lanye
 * @since 2025/07/27
 * @see org.com.tools.constant.MQConstant#ACK_TOPIC
 * @see org.com.tools.constant.MQConstant#ACK_MANAGER_GROUP
 */
@Slf4j
@Service
@RequiredArgsConstructor
@RocketMQMessageListener(topic = MQConstant.ACK_TOPIC, consumerGroup = MQConstant.ACK_MANAGER_GROUP)
public class AckCycleConsumer implements RocketMQListener<String> {
    private final MessageDelayQueue messageDelayQueue;
    private final UserInBoxDocDao userInBoxDocDao;

    @Override
    public void onMessage(String text) {
        MessageReq req = JSON.parseObject(text, MessageReq.class);
        userInBoxDocDao.ackConfirm(req.getFromUid(), req.getMessageId());
        messageDelayQueue.deliverConfirm(req.getFromUid(), req.getMessageId());
    }
}
