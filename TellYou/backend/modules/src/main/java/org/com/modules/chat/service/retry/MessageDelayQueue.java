package org.com.modules.chat.service.retry;

import lombok.RequiredArgsConstructor;
import org.com.modules.chat.constant.DelayQueConstant;
import org.com.modules.chat.domain.vo.MessageVO;
import org.com.tools.utils.ChannelManagerUtil;
import org.redisson.api.RBlockingQueue;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class MessageDelayQueue {
    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;

    ConcurrentHashMap<String, MessageVO> messageCache;
    ConcurrentHashMap<String, Integer> messageRetryCount;


    @Value("${server.node}")
    private String node;

    public void submit(MessageVO vo){
        RBlockingQueue<MessageVO> queue = redissonClient.getBlockingQueue(DelayQueConstant.DELAY_QUEUE + node);
        queue.offer(vo);
    }
    /**
     * 提交延迟消息
     * @param vo 消息vo
     * @param delay 延迟时间
     * @param timeUnit 时间单位
     */
    public void submitWithDelay(Long uid, MessageVO vo, long delay, TimeUnit timeUnit){
        try {
            RBlockingQueue<String> queue = redissonClient.getBlockingQueue(DelayQueConstant.DELAY_QUEUE + node);
            String locating = String.valueOf(uid) + ":" + vo.getMessageId();

            messageCache.put(locating, vo);
            messageRetryCount.put(locating, 1);

            queue.offer(locating, delay, timeUnit);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("提交延迟消息被中断 1", e);
        }
    }

    @Scheduled(fixedDelay = 1000)
    public void processDelayedMessage(){
        RBlockingQueue<String> queue = redissonClient.getBlockingQueue(DelayQueConstant.DELAY_QUEUE + node);

        for (int i = 0; i < 300; ++ i){
            String locating = queue.poll();
            if (locating == null) break;

            Long uid = Long.parseLong(locating.split(":")[0]);
            if (messageCache.get(locating) != null){
                Integer count = messageRetryCount.get(locating);

                if (count > 3){
                    clear(locating);
                    // 进入死信队列，做最多 4 次发送，1 次正常发送， 3次重试
                } else {
                    messageRetryCount.put(locating, count+1);
                    MessageVO vo = messageCache.get(locating);
                    if (vo != null){
                        boolean success = channelManagerUtil.doDeliver(uid, vo);
                        if (success){
                            try {
                                queue.offer(locating, 2, TimeUnit.SECONDS);
                            } catch (InterruptedException e) {
                                throw new RuntimeException("提交延迟消息被中断 2", e);
                            }
                        }
                    }
                }
            }
        }

    }


    private void clear(String locating){
        messageCache.remove(locating);
        messageRetryCount.remove(locating);
    }
}
