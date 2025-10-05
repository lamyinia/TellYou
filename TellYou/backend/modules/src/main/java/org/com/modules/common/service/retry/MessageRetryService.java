package org.com.modules.common.service.retry;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * @author: lanye
 * @date: 2025/07/27 21:14
 * @description 服务端执行重试任务的服务
 * @replenish
 */

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageRetryService {
    private final MessageDelayQueue messageDelayQueue;
    private final ChannelManagerUtil channelManagerUtil;


    @Retryable(value = RuntimeException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void retryDelivery(Long uid, Object vo) {
        boolean success = channelManagerUtil.doDeliver(uid, vo);
        if (success){
            messageDelayQueue.initCache4Deliver(uid, vo);
            messageDelayQueue.submitWithDelay(uid, vo, 1, TimeUnit.SECONDS);
        } else {
            throw new RuntimeException("路由表查不到");
        }
    }

    public void retryPublish(List<Long> uidList, MessageResp vo){
        messageDelayQueue.initCache4Group(uidList, vo);

        uidList.forEach(uid -> {
            if (channelManagerUtil.getChannel(uid) != null){
                log.info("广播发现用户 {} 上线", uid);
                channelManagerUtil.doDeliver(uid, vo);
                messageDelayQueue.submitWithDelay(uid, vo, 1, TimeUnit.SECONDS);
            }
        });
    }
}
