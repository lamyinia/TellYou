package org.com.modules.common.service.dispatch;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.vo.resp.ContactApplyResp;
import org.com.tools.constant.MQConstant;
import org.com.tools.constant.RedissonConstant;
import org.redisson.api.RedissonClient;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 将消息投递到用户，投递前将消息写入信箱
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

    public void dispatch(DeliveryEnum deliveryEnum, Object message, List<Long> uidList){
        switch (deliveryEnum){
            case MESSAGE:
                dispatchMessage((MessageResp) message, uidList);
                break;
            case APPLY:
                ContactApplyResp resp = new ContactApplyResp();
                BeanUtils.copyProperties((ContactApply)message, resp);
                resp.setAvatar("默认url...");
                resp.setTargetName("无名氏...");

                dispatchApply(resp, uidList);
                break;
        }
    }

    private void dispatchMessage(MessageResp resp, List<Long> uidList){
        if (uidList.size() <= NEED_DELIVERY_BOUNDARY){
            uidList.forEach(uid -> {
                String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
                if (node != null){
                    resp.setToUserId(uid);
                    redissonClient.getTopic(node).publish(resp);
                }
            });
        } else {
            rocketMQTemplate.convertAndSend(MQConstant.GROUP_TOPIC, new SubscribedItem(uidList, resp));
        }
    }
    private void dispatchApply(ContactApplyResp resp, List<Long> uidList){
        uidList.forEach(uid -> {
            ContactApplyResp letter = resp;
            letter.setDeliverId(uid);
            String node = (String) redissonClient.getMap(RedissonConstant.ROUTE).get(uid);
            if (node != null){
                redissonClient.getTopic(node).publish(letter);
            } else {
                log.info("{} 没上线", uid);
            }
        });
    }
}
