package org.com.modules.common.service.retry;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.vo.push.PushedBehaviour;
import org.com.modules.user.domain.vo.push.PushedChat;
import org.com.modules.user.domain.vo.push.PushedApply;
import org.com.modules.user.domain.vo.push.PushedSession;
import org.com.tools.utils.ChannelManagerUtil;
import org.redisson.api.RBlockingQueue;
import org.redisson.api.RScoredSortedSet;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.concurrent.*;

/**
 * 用 RSortedSet + Spring Schedule 重试实现的延时任务
 *
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

    private static final String DELAY_SORTED_SET = "delay:sortedset:";
    private static final String DELAY_QUEUE = "delay:queue:";
    private static final int[] retryWaitingByCount = {1, 2, 4, 8};

    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;

    /**
     * @letterCache： 信息重试的缓存，键值是 [messageId, vo]，和 uid 无关
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


    public void initCache4Deliver(Long uid, Object vo) {
        String letterId = getLetterId(vo);
        letterCache.put(letterId, vo);
        scheduleCleanup(letterId);
        letterRetryCount.put(getRetryKey(uid, vo), 1);
    }

    public void initCache4Group(List<Long> uidList, Object vo) {
        String letterId = getLetterId(vo);
        letterCache.put(letterId, vo);
        scheduleCleanup(letterId);

        uidList.forEach(uid -> letterRetryCount.put(getRetryKey(uid, vo), 1));
    }

    /**
     * 提交延迟消息
     *
     * @param vo       消息vo
     * @param delay    延迟时间
     * @param timeUnit 时间单位
     */
    public void submitWithDelay(Long uid, Object vo, long delay, TimeUnit timeUnit) {
        RScoredSortedSet<String> scoredSortedSet = redissonClient.getScoredSortedSet(DELAY_SORTED_SET + node);
        scoredSortedSet.add(System.currentTimeMillis() + timeUnit.toMillis(delay), getRetryKey(uid, vo));
    }

    @Scheduled(fixedDelay = 1000)
    public void moveExpiredToQueue() {
        RScoredSortedSet<String> scoredSortedSet = redissonClient.getScoredSortedSet(DELAY_SORTED_SET + node);
        RBlockingQueue<String> blockingQueue = redissonClient.getBlockingQueue(DELAY_QUEUE + node);

        Collection<String> expired = scoredSortedSet.valueRange(0, true, System.currentTimeMillis(), true);

        for (String msg : expired) {
            if (scoredSortedSet.remove(msg)) {
                blockingQueue.offer(msg);
            }
        }
    }

    @Scheduled(fixedDelay = 1000)
    public void processDelayedMessage() {
        RBlockingQueue<String> queue = redissonClient.getBlockingQueue(DELAY_QUEUE + node);

        for (int i = 0; i < 300; ++i) {
            String locating = queue.poll();
            if (locating == null) break;

            String[] split = locating.split(":");
            Long uid = Long.parseLong(split[0]);
            String letterId = split[1];

            Object vo = letterCache.get(letterId);

            if (vo != null) {
                Integer count = letterRetryCount.get(locating);
                if (count == null) continue;  // 规定收到对于 uid:messageId 的 ack 之后，把 letterRetryCount 清理掉

                if (count > 3) {
                    log.info("{} 进入死信队列", locating);
                    letterRetryCount.remove(locating);
                } else {
                    log.info("第 {} 次向用户 {} 推送消息", count + 1, uid);
                    letterRetryCount.put(locating, count + 1);
                    channelManagerUtil.doDeliver(uid, vo);
                    submitWithDelay(uid, vo, retryWaitingByCount[count], TimeUnit.SECONDS);
                }
            }
        }
    }

    /**
     * 安排 30s 后清理指定消息ID的缓存
     */
    private void scheduleCleanup(String messageId) {
        ScheduledFuture<?> existingTask = cleanupTasks.get(messageId);
        if (existingTask != null && !existingTask.isDone()) {
            existingTask.cancel(false);
        }
        ScheduledFuture<?> cleanupTask = scheduler.schedule(() -> {
            try {
                letterCache.remove(messageId);
                cleanupTasks.remove(messageId);
            } catch (Exception e) {
                log.error("清理任务执行异常，消息ID: {}, 错误: {}", messageId, e.getMessage(), e);
            }
        }, 30, TimeUnit.SECONDS);

        cleanupTasks.put(messageId, cleanupTask);
    }


    private String getRetryKey(Long uid, Object vo) {
        return uid + ":" + getLetterId(vo);
    }

    private String getLetterId(Object vo) {
        return switch (vo){
            case PushedChat letter -> letter.getMessageId() + "-message";
            case PushedApply letter -> letter.getApplyId() + "-apply";
            case PushedSession letter -> "-session";
            case PushedBehaviour letter -> "-behaviour";
            default -> "null";
        };
    }

    public void deliverConfirm(Long uid, String messageId, String suffix){
        log.info("删除键{}:{}{}", uid, messageId, suffix);
        letterRetryCount.remove(uid + ":" + messageId + suffix);
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
