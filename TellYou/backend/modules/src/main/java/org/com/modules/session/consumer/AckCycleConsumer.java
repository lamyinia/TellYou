package org.com.modules.session.consumer;


import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.tools.constant.MQConstant;
import org.springframework.stereotype.Service;

/**
 * @author lanye
 * @date 2025/07/27
 * @description: ack整个生命周期的处理机制，兜底 ack 发送失败的情况
 * @(1) 对于从客户端推出去的消息，客户端对没有收到 ack 的信息，会将其持久化到待定状态的队列，定时的拉取消息，直到收到 ack
 * @(2) 客户端从离线到上线的状态变化，需要从信箱里面拉取近期未收到的消息
 * @(3) 所有从服务器推出去的消息，服务端总要去得到一个客户端确认的 ack 状态
 */
@Slf4j
@Service
@RocketMQMessageListener(topic = MQConstant.ACK_TOPIC, consumerGroup = MQConstant.ACK_MANAGER_GROUP)
public class AckCycleConsumer implements RocketMQListener<MessageReq> {

    @Override
    public void onMessage(MessageReq messageReq) {

    }

}
