package org.com.modules.chat.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.chat.domain.document.MessageMailBox;
import org.com.modules.chat.domain.dto.MessageDTO;
import org.com.modules.chat.service.MessageMailBoxService;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageMailBoxServiceImpl implements MessageMailBoxService {
    private static final String SEQUENCE_KEY_PREFIX = "msg:seq:";
    private static final String LOCK_KEY_PREFIX = "msg:lock:";
    private static final int LOCK_EXPIRE_TIME = 5;
    private static final int MAX_RETRY_COUNT = 3;
    private static final long MESSAGE_EXPIRE_DAYS = 30;

    private final MongoTemplate mongoTemplate;
    private final RedissonClient redissonClient;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public MessageMailBox save(MessageDTO dto) {
        if (isMessageExists(dto)){
            log.info("消息已存在，跳过保存: {}", dto.getMessageId());
            return null;
        }

        String lockKey = LOCK_KEY_PREFIX + dto.getToUserId();
        String sequenceKey = SEQUENCE_KEY_PREFIX + dto.getToUserId();
        
        try {
            RLock lock = redissonClient.getLock(lockKey);
            boolean lockAcquired = lock.tryLock(LOCK_EXPIRE_TIME, TimeUnit.SECONDS);
            
            if (!lockAcquired) {
                log.warn("获取锁失败，消息处理中: {}", dto.getMessageId());
                throw new RuntimeException("消息正在处理中，请稍后重试");
            }

            Long sequenceNumber = 1L;
            MessageMailBox messageMailBox = buildMessageMailBox(dto, sequenceNumber);
            MessageMailBox savedMessage = mongoTemplate.save(messageMailBox);
            
            log.info("消息保存成功，序列号: {}, 消息ID: {}", sequenceNumber, savedMessage.getServerMessageId());
            
            return savedMessage;
            
        } catch (Exception e) {
            log.error("保存消息到信箱失败: {}", e.getMessage(), e);
            throw new RuntimeException("保存消息失败", e);
        } finally {
            RLock lock = redissonClient.getLock(lockKey);
            if (lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    /**
     * 生成严格递增的序列号
     * 由于外层已经获取了分布式锁，这里直接使用Redis递增即可
     */
    private Long generateStrictlyIncreasingSequence(String sequenceKey) {
        Object currentSeq = redisTemplate.opsForValue().get(sequenceKey);
        Long sequenceNumber;
        
        if (currentSeq == null) {
            // 检查MongoDB中是否已有消息，获取最大序列号
            String sessionId = sequenceKey.replace(SEQUENCE_KEY_PREFIX, "");
            Query query = new Query(Criteria.where("sessionId").is(sessionId));
            query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "sequenceNumber"));
            query.limit(1);
            
            MessageMailBox lastMessage = mongoTemplate.findOne(query, MessageMailBox.class);
            sequenceNumber = (lastMessage != null && lastMessage.getSequenceNumber() != null) 
                ? lastMessage.getSequenceNumber() + 1 : 1L;
        } else {
            sequenceNumber = Long.valueOf(currentSeq.toString()) + 1;
        }
        
        redisTemplate.opsForValue().set(sequenceKey, sequenceNumber);
        
        return sequenceNumber;
    }

    /**
     * 构建MessageMailBox对象
     */
    private MessageMailBox buildMessageMailBox(MessageDTO dto, Long sequenceNumber) {
        long currentTime = System.currentTimeMillis();
        
        return MessageMailBox.builder()
                .sessionId(dto.getToUserId())
                .clientMessageId(dto.getMessageId())
                .serverMessageId(generateServerMessageId())
                .sequenceNumber(sequenceNumber)
                .messageType(getMessageType(dto.getType()))
                .senderId(dto.getFromUserId())
                .toUserIds(List.of(dto.getToUserId())) // 单聊只有一个接收者
                .content(dto.getContent())
                .clientTimestamp(dto.getTimestamp())
                .serverTimestamp(currentTime)
                .adjustedTimestamp(calculateAdjustedTimestamp(dto.getTimestamp(), currentTime))
                .createTime(currentTime)
                .updateTime(currentTime)
                .ackBitmap(new byte[0]) // 初始化ACK位图
                .expired(false)
                .expireTime(currentTime + (MESSAGE_EXPIRE_DAYS * 24 * 60 * 60 * 1000L))
                .extra(dto.getExtra())
                .build();
    }

    /**
     * 生成服务端消息ID
     */
    private String generateServerMessageId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 获取消息类型字符串
     */
    private String getMessageType(Integer type) {
        if (type == null) return "UNKNOWN";
        
        switch (type) {
            case 1: return "TEXT";
            case 2: return "IMAGE";
            case 3: return "VIDEO";
            case 4: return "VOICE";
            case 5: return "FILE";
            case 6: return "RED_PACKET";
            default: return "UNKNOWN";
        }
    }

    /**
     * 计算调整后的时间戳（用于时序排序）
     * 如果客户端时间戳异常，使用服务端时间戳
     */
    private Long calculateAdjustedTimestamp(Long clientTimestamp, Long serverTimestamp) {
        if (clientTimestamp == null) {
            return serverTimestamp;
        }
        
        // 检查客户端时间戳是否合理（与服务器时间相差不超过5分钟）
        long timeDiff = Math.abs(serverTimestamp - clientTimestamp);
        if (timeDiff > 5 * 60 * 1000) { // 5分钟
            log.warn("客户端时间戳异常，使用服务端时间戳: client={}, server={}", clientTimestamp, serverTimestamp);
            return serverTimestamp;
        }
        
        return clientTimestamp;
    }

    /**
     * 检查消息是否已存在（幂等性检查）
     */
    private boolean isMessageExists(MessageDTO dto) {
        return false;
/*        Query query = new Query(Criteria.where("clientMessageId").is(dto.getMessageId())
                .and("senderId").is(dto.getFromUserId()));
        
        return mongoTemplate.exists(query, MessageMailBox.class);*/
    }
}
