package org.com.modules.common.service.dispatch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.session.domain.entity.Message;
import org.com.modules.user.domain.vo.push.PushedApply;
import org.com.modules.user.domain.vo.push.PushedChat;
import org.com.modules.user.domain.vo.push.PushedSession;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.RedissonConstant;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 将消息投递到用户
 * @author lanye
 * @date 2025/08/01
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DispatcherService {
    private final RedissonClient redissonClient;
    private final RocketMQTemplate rocketMQTemplate;
    private final Integer NEED_DELIVERY_BOUNDARY = 501;

    public void dispatch(DeliveryEnum deliveryEnum, Object message, List<Long> uidList) {
        switch (deliveryEnum) {
            case MESSAGE -> dispatchChat((PushedChat) message, uidList);
            case APPLY -> dispatchApply((PushedApply) message, uidList);
            case SESSION -> dispatchSession((PushedSession) message, uidList);
        }
    }

    private void dispatchChat(PushedChat resp, List<Long> uidList){
        if (uidList.size() <= NEED_DELIVERY_BOUNDARY){
            uidList.forEach(uid -> {
                String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
                if (node != null){
                    resp.setReceiverId(uid);
                    redissonClient.getTopic(node).publish(resp);
                }
            });
        } else {
            rocketMQTemplate.convertAndSend(MQConstant.GROUP_TOPIC, new SubscribedItem(uidList, resp));
        }
    }

    private void dispatchApply(PushedApply resp, List<Long> uidList){
        PushedApply letter = resp;
        uidList.forEach(uid -> {
            String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
            if (node != null){
                letter.setReceiverId(uid);
                redissonClient.getTopic(node).publish(letter);
            } else {
                log.info("{} 没上线", uid);
            }
        });
    }

    private void dispatchSession(PushedSession resp, List<Long> uidList){
        uidList.forEach(uid -> {
            String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
            if (node != null){
                resp.setReceiverId(uid);
                redissonClient.getTopic(node).publish(resp);
            } else {
                log.info("{} 没上线", uid);
            }
        });
    }
}
