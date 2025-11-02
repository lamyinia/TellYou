package org.com.modules.deliver.service.retry;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 消息推送重试服务入口 <br><br>
 * SpringRetry 设计的有点多余了，当初有点为了用而用的感觉
 * <ul>
 * <li>自动重试机制：支持指数退避和固定间隔</li>
 * <li>失败处理：记录失败原因并触发告警</li>
 * <li>监控统计：提供重试次数和成功率统计</li>
 * </ul>
 * @author lanye
 * @since 2025/07/27 21:14
 */

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageRetryService {
    private final MessageDelayQueue messageDelayQueue;
    private final ChannelManagerUtil channelManagerUtil;


    // @Retryable(value = RuntimeException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void retryDelivery(Long uid, Object vo) {
        boolean exist = channelManagerUtil.doDeliver(uid, vo);
        if (exist){
            messageDelayQueue.initCache4Deliver(uid, vo);
            messageDelayQueue.submitWithDelay(uid, vo, 1, TimeUnit.SECONDS);
        } else {
            throw new RuntimeException("路由表查不到");
        }
    }

    /**
     * content
     * @author lanye
     * @since 2025/10/31 14:56
     */

    public void retryPublish(List<Long> uidList, PushedChat vo){
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
