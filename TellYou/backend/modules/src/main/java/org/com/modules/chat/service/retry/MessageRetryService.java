package org.com.modules.chat.service.retry;

import lombok.RequiredArgsConstructor;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.tools.utils.ChannelManagerUtil;
import org.redisson.api.RBlockingQueue;
import org.redisson.api.RDelayedQueue;
import org.redisson.api.RedissonClient;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class MessageRetryService {
    private final MessageDelayQueue messageDelayQueue;
    private final ChannelManagerUtil channelManagerUtil;
    private final RedissonClient redissonClient;

    public void deliverWithRetry(MessageDTO dto) {
        messageDelayQueue.submit(dto);
    }

    @Retryable(value = RuntimeException.class, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void performDelivery(MessageDTO message) {
        boolean success = channelManagerUtil.deliver(message.getToUserId(), message);

        if (!success) {  // TODO 异常完善
            throw new RuntimeException("Message delivery failed");
        }
        // 更新状态为已投递（等待ACK）

        // 0.5 秒后去检查 ack
        scheduleAckCheck(message.getMessageId(), 500, TimeUnit.MILLISECONDS);
    }

    /**
     * 调度ACK检查
     * @param messageId
     * @param delay
     * @param unit
     */
    private void scheduleAckCheck(String messageId, long delay, TimeUnit unit) {
        RDelayedQueue<String> delayedQueue = redissonClient.getDelayedQueue(
                redissonClient.getBlockingQueue("msg:ack_check_queue")
        );
        delayedQueue.offer(messageId, delay, unit);
    }

    /**
     * ACK检查定时任务
     */
    @Scheduled(fixedRate = 1000)
    public void checkPendingAcks() {
        RBlockingQueue<String> queue = redissonClient.getBlockingQueue("msg:ack_check_queue");

        for (int i = 0; i < 100; ++ i){
            String messageId = queue.poll();
            if (messageId != null) {
                // 未收到 ack 的重新放入任务队列
            }
        }
    }

    private void handleMissingAck(MessageDTO message) {
        // 如果大于最大重试次数，标记为 Failed，不再重试
        // 否则指数退避重试
    }

    /**
     * 指数退避计算
     * @param retryCount
     * @return
     */
    private int calculateNextDelay(int retryCount) {
        return (int) Math.min(1000 * Math.pow(2, retryCount), 60000);
    }

//    public int drainTo(Collection<? super E> c, int maxElements) {
//        // 单次网络往返获取多条消息
//        return get(drainToAsync(c, maxElements));
//    }
}
