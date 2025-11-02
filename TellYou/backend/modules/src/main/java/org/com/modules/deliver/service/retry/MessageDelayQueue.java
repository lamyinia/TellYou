package org.com.modules.deliver.service.retry;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.RemovalCause;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.deliver.config.MessageRetryConfig;
import org.com.modules.deliver.domain.vo.push.PushedCommand;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.modules.deliver.domain.vo.push.PushedApply;
import org.com.modules.deliver.domain.vo.push.PushedSession;
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

    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;
    private final MessageRetryConfig retryConfig;

    private Cache<String, Object> letterCache;
    private int[] retryWaitingByCount;

    /**
     * 初始化缓存和配置
     */
    @PostConstruct
    public void init() {
        this.letterCache = Caffeine.newBuilder()
                .expireAfterWrite(retryConfig.getCacheExpire(), TimeUnit.SECONDS)
                .maximumSize(retryConfig.getMaximumSize())
                .recordStats()
                .removalListener(this::onCacheRemoval)
                .build();

        this.retryWaitingByCount = retryConfig.getRetryWaitingByCount().stream()
                .mapToInt(Integer::intValue)
                .toArray();

        log.info("消息重试配置初始化完成: cacheExpire={}s, maximumSize={}, maxRetryCount={}, retryWaitingByCount={}",
                retryConfig.getCacheExpire(), retryConfig.getMaximumSize(),
                retryConfig.getMaxRetryCount(), retryConfig.getRetryWaitingByCount());
    }

    /**
     * 投递消息重试的次数，键值是 [userId:message, count]
     */
    private final ConcurrentHashMap<String, Integer> letterRetryCount = new ConcurrentHashMap<>();


    public void initCache4Deliver(Long userId, Object vo) {
        String letterId = getLetterId(vo);
        //  复用推送的消息
        if (letterCache.getIfPresent(letterId) == null) {
            letterCache.put(letterId, vo);
        }
        letterRetryCount.put(getRetryKey(userId, vo), 1);
    }

    public void initCache4Group(List<Long> userIdList, Object vo) {
        String letterId = getLetterId(vo);
        letterCache.put(letterId, vo);

        userIdList.forEach(userId -> letterRetryCount.put(getRetryKey(userId, vo), 1));
    }

    /**
     * 提交延迟消息
     *
     * @param vo       消息vo
     * @param delay    延迟时间
     * @param timeUnit 时间单位
     */
    public void submitWithDelay(Long userId, Object vo, long delay, TimeUnit timeUnit) {
        RScoredSortedSet<String> scoredSortedSet = redissonClient.getScoredSortedSet(DELAY_SORTED_SET + node);
        scoredSortedSet.add(System.currentTimeMillis() + timeUnit.toMillis(delay), getRetryKey(userId, vo));
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
            Long userId = Long.parseLong(split[0]);
            String letterId = split[1];

            Object vo = letterCache.getIfPresent(letterId);

            if (vo != null) {
                Integer count = letterRetryCount.get(locating);
                if (count == null) continue;  // 规定收到对于 userId:messageId 的 ack 之后，把 letterRetryCount 清理掉

                if (count > retryConfig.getMaxRetryCount()) {
                    log.info("{} 进入死信队列", locating);
                    letterRetryCount.remove(locating);
                } else {
                    log.info("第 {} 次向用户 {} 推送消息", count + 1, userId);
                    letterRetryCount.put(locating, count + 1);
                    channelManagerUtil.doDeliver(userId, vo);
                    submitWithDelay(userId, vo, retryWaitingByCount[count], TimeUnit.SECONDS);
                }
            } else {
                // 处理letterCache过期的消息
                handleExpiredMessage(locating, userId, letterId);
            }
        }
    }

    /**
     * 缓存移除监听器 - 当消息过期时自动清理相关重试计数
     */
    private void onCacheRemoval(String letterId, Object value, RemovalCause cause) {
        if (cause == RemovalCause.EXPIRED) {
            log.info("消息缓存过期: letterId={}", letterId);
            // 清理相关的重试计数
            cleanupExpiredRetryCount(letterId);
        }
    }

    /**
     * 清理过期消息的重试计数
     */
    private void cleanupExpiredRetryCount(String letterId) {
        letterRetryCount.entrySet().removeIf(entry -> {
            String retryKey = entry.getKey();
            return retryKey.endsWith(":" + letterId);
        });
    }

    /**
     * 处理letterCache过期的消息
     */
    private void handleExpiredMessage(String locating, Long userId, String letterId) {
        Integer count = letterRetryCount.get(locating);
        if (count != null) {
            log.warn("消息内容已过期，停止重试: userId={}, letterId={}, retryCount={}", userId, letterId, count);
            letterRetryCount.remove(locating);
            log.warn("死信记录: userId={}, letterId={}, retryCount={}, reason={}", userId, letterId, count, "MESSAGE_CONTENT_EXPIRED");
        }
    }

    private String getRetryKey(Long userId, Object vo) {
        return userId + ":" + getLetterId(vo);
    }

    private String getLetterId(Object vo) {
        return switch (vo){
            case PushedChat letter -> letter.getMessageId() + "-message";
            case PushedApply letter -> letter.getApplyId() + "-apply";
            case PushedSession letter -> letter.getAckId() + "-session";
            case PushedCommand letter -> "-behaviour";
            default -> "null";
        };
    }

    public void deliverConfirm(Long userId, String messageId, String suffix){
        log.info("删除键{}:{}{}", userId, messageId, suffix);
        letterRetryCount.remove(userId + ":" + messageId + suffix);
    }

    /**
     * 销毁方法，清理缓存资源
     */
    @PreDestroy
    public void destroy() {
        log.info("清理消息重试缓存");
        letterCache.invalidateAll();
        letterRetryCount.clear();
    }
}
