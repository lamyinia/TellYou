package org.com.modules.chat.service.retry;

import io.netty.channel.Channel;
import lombok.RequiredArgsConstructor;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.tools.utils.ChannelManagerUtil;
import org.redisson.api.RBlockingQueue;
import org.redisson.api.RDelayedQueue;
import org.redisson.api.RedissonClient;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

import static org.com.modules.chat.constant.DelayQueConstant.DELAY_QUEUE;

@Component
@RequiredArgsConstructor
public class MessageDelayQueue {
    private final RedissonClient redissonClient;
    private final ChannelManagerUtil channelManagerUtil;
    private final MongoTemplate mongoTemplate;

    public void submit(MessageDTO dto){
        RBlockingQueue<String> queue = redissonClient.getBlockingQueue(DELAY_QUEUE);
        RDelayedQueue<String> delayedQueue = redissonClient.getDelayedQueue(queue);

        delayedQueue.offer(dto.getMessageId(), 0, TimeUnit.SECONDS);
    }

    @Scheduled(fixedDelay = 1000)
    public void processDelayedMessage(){
        RBlockingQueue<String> queue = redissonClient.getBlockingQueue(DELAY_QUEUE);

        for (int i = 0; i < 100; ++ i){
            String messageId = queue.poll();
            if (messageId == null) break;

            MessageDTO dto = mongoTemplate.findById(messageId, MessageDTO.class);
            if (dto != null && dto.getType() != -1) {
                channelManagerUtil.deliver(dto.getToUserId(), dto);
            }
        }
    }
}
