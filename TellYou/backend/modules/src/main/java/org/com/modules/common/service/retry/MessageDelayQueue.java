package org.com.modules.common.service.retry;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.constant.DelayQueConstant;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.user.domain.vo.resp.ContactApplyResp;
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
 * 用 redisson 重试实现的延迟队列
 * @author lanye
 * @date 2025/07/29
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageDelayQueue {
    @Value("${server.retry.threads}")
    private int threadPoolSize;
    @Value("${server.node}")
    private String node;

    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;

    /**
     * @letterCache：  信息重试的缓存，键值是 [messageId, vo]，和 uid 无关
     */
    ConcurrentHashMap<String, Object> letterCache = new ConcurrentHashMap<>();

    /**
     * @letterRetryCount: 信息重试的次数，键值是 [uid:message, count]
     */
    ConcurrentHashMap<String, Integer> letterRetryCount = new ConcurrentHashMap<>();

    /**
     * 缓存清理任务调度器
     */
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(threadPoolSize);

    /**
     * 存储每个消息ID对应的清理任务
     */
    private final ConcurrentHashMap<String, ScheduledFuture<?>> cleanupTasks = new ConcurrentHashMap<>();


    public void initCache4Deliver(Long uid, Object vo){
        String letterId = getLetterId(vo);
        letterCache.put(letterId, vo);
        scheduleCleanup(letterId);

        letterRetryCount.put(locating(uid, vo), 1);
    }
    
    public void initCache4Group(List<Long> uidList, Object vo){
        String letterId = getLetterId(vo);
        letterCache.put(letterId, vo);
        scheduleCleanup(letterId);

        uidList.forEach(uid -> letterRetryCount.put(locating(uid, vo), 1));
    }

    /**
     * 提交延迟消息
     * @param vo 消息vo
     * @param delay 延迟时间
     * @param timeUnit 时间单位
     */
    public void submitWithDelay(Long uid, Object vo, long delay, TimeUnit timeUnit){
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
            String letterId = split[1];

            Object vo = letterCache.get(letterId);

            if (vo != null){
                Integer count = letterRetryCount.get(locating);
                if (count == null) continue;

                if (count == 0){
                    letterRetryCount.remove(locating);
                    continue;  // 当收到 ack，会设置 count = 0
                }

                if (count > 3){
                    log.info("{} 进入死信队列", locating);
                    letterRetryCount.remove(locating);
                    // 进入死信队列，做最多 4 次发送，1 次正常发送， 3次重试
                } else {
                    log.info("第 {} 次向用户 {} 推送消息", count+1, uid);
                    letterRetryCount.put(locating, count+1);
                    boolean success = channelManagerUtil.doDeliver(uid, vo);
                    if (success){
                        try { queue.offer(locating, 2, TimeUnit.SECONDS);}
                        catch (InterruptedException e) {throw new RuntimeException("提交延迟消息被中断 2", e);}
                    } else {
                        log.info("查不到路由表");
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

        log.info("准备安排清理任务，消息ID: {}", messageId);

        ScheduledFuture<?> cleanupTask = scheduler.schedule(() -> {
            try {
                log.info("开始执行缓存清理任务，消息ID: {}", messageId);
                letterCache.remove(messageId);
                cleanupTasks.remove(messageId);
                log.info("清理任务完成，消息ID: {}", messageId);
            } catch (Exception e) {
                log.error("清理任务执行异常，消息ID: {}, 错误: {}", messageId, e.getMessage(), e);
            }
        }, 1, TimeUnit.MINUTES);
        
        cleanupTasks.put(messageId, cleanupTask);
    }

    
    private String locating(Long uid, Object vo){
        return String.valueOf(uid) + ":" + getLetterId(vo);
    }
    private String getLetterId(Object vo){
        if (vo.getClass() == MessageResp.class){
            return ((MessageResp) vo).getMessageId() + "-message";
        }
        if (vo.getClass() == ContactApplyResp.class){
            return ((ContactApplyResp) vo).getApplyId() + "-apply";
        }
        return null;
    }
    
    /**
     * 销毁方法，清理调度器资源
     */
    @PreDestroy
    public void destroy() {
        if (scheduler != null && !scheduler.isShutdown()) {
            log.info("ack 缓存清理调度器被关闭");
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
