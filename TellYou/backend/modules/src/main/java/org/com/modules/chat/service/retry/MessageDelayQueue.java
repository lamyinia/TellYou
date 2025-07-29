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

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledFuture;

/**
 * @author lanye
 * @date 2025/07/29
 * @description: 用 redisson 重试实现的延迟队列
 */
@Component
@RequiredArgsConstructor
public class MessageDelayQueue {
    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;

    /**
     * @messageCache：  信息重试的缓存，键值是 [messageId, vo]，和 uid 无关
     */
    ConcurrentHashMap<String, MessageVO> messageCache = new ConcurrentHashMap<>();

    /**
     * @messageRetryCount: 信息重试的次数，键值是 [uid:message, count]
     */
    ConcurrentHashMap<String, Integer> messageRetryCount = new ConcurrentHashMap<>();

    /**
     * 缓存清理任务调度器
     */
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    /**
     * 存储每个消息ID对应的清理任务
     */
    private final ConcurrentHashMap<String, ScheduledFuture<?>> cleanupTasks = new ConcurrentHashMap<>();



    @Value("${server.node}")
    private String node;

    public void initCache4Deliver(Long uid, MessageVO vo){
        String messageId = vo.getMessageId();
        messageCache.put(messageId, vo);
        scheduleCleanup(messageId);

        messageRetryCount.put(locating(uid, vo), 1);
    }
    
    public void initCache4Group(List<Long> uids, MessageVO vo){
        String messageId = vo.getMessageId();
        messageCache.put(messageId, vo);
        scheduleCleanup(messageId);

        uids.forEach(uid -> messageRetryCount.put(locating(uid, vo), 1));
    }

    /**
     * @param vo - 消息vo
     */
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
            queue.offer(locating(uid, vo), delay, timeUnit);
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

            String[] split = locating.split(":");
            Long uid = Long.parseLong(split[0]);
            String messageId = split[1];

            if (messageCache.get(locating) != null){
                Integer count = messageRetryCount.get(locating);
                if (count == 0) continue;

                if (count > 3){
                    // 进入死信队列，做最多 4 次发送，1 次正常发送， 3次重试
                } else {
                    messageRetryCount.put(locating, count+1);
                    MessageVO vo = messageCache.get(messageId);
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

    /**
     * 安排1分钟后清理指定消息ID的缓存
     */
    private void scheduleCleanup(String messageId) {
        ScheduledFuture<?> existingTask = cleanupTasks.get(messageId);
        if (existingTask != null && !existingTask.isDone()) {
            existingTask.cancel(false);
        }
        
        ScheduledFuture<?> cleanupTask = scheduler.schedule(() -> {
            messageCache.remove(messageId);
            cleanupTasks.remove(messageId);
        }, 1, TimeUnit.MINUTES);
        
        cleanupTasks.put(messageId, cleanupTask);
    }

    
    private String locating(Long uid, MessageVO vo){
        return String.valueOf(uid) + ":" + vo.getMessageId();
    }
    
    /**
     * 销毁方法，清理调度器资源
     */
    public void destroy() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}
