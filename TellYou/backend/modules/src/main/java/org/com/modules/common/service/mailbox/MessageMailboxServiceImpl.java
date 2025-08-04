package org.com.modules.common.service.mailbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.dao.MessageMailboxDao;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.common.domain.document.MessageMailboxDocument;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageMailboxServiceImpl implements MessageMailboxService {
    private static final String SEQUENCE_KEY_PREFIX = "msg:seq:";
    private static final String LOCK_KEY_PREFIX = "msg:lock:";
    private static final int LOCK_EXPIRE_TIME = 5;
    private static final long MESSAGE_EXPIRE_DAYS = 30;

    private final MessageMailboxDao messageMailboxDao;
    private final MongoSessionDao mongoSessionDao;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageMailboxDocument save(MessageReq req) {
        if (isMessageExists(req)){
            log.info("消息已存在，跳过保存: {}", req.getMessageId());
            return null;
        }
        Long sequenceNumber = getSequenceIdFromSession(req.getSessionId());
        MessageMailboxDocument document = buildMessageMailBox(req, sequenceNumber);
        MessageMailboxDocument savedMessage = messageMailboxDao.save(document);
        log.info("消息保存成功，序列号: {}, 消息ID: {}", sequenceNumber, savedMessage.getMessageId());

        return savedMessage;
    }

    @RedissonLocking(prefixKey = "msg:seq", key = "#sessionId")
    private Long getSequenceIdFromSession(Long sessionId){
        Long sequenceId = mongoSessionDao.getAndIncrementSequenceId(sessionId);
        return sequenceId;
    }

    /**
     * 构建MessageMailBox对象
     */
    private MessageMailboxDocument buildMessageMailBox(MessageReq dto, Long sequenceNumber) {
        long currentTime = System.currentTimeMillis();
        
        return MessageMailboxDocument.builder()
                .sessionId(dto.getToUserId())
                .clientMessageId(dto.getMessageId())
                .sequenceNumber(sequenceNumber)
                .messageType(getMessageType(dto.getType()))
                .senderId(dto.getFromUid())
                .content(dto.getContent())
                .adjustedTimestamp(calculateAdjustedTimestamp(dto.getTimestamp(), currentTime))
                .createTime(currentTime)
                .updateTime(currentTime)
                .extra(dto.getExtra())
                .ackStatus(0)
                .build();
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
    private String calculateAdjustedTimestamp(Long clientTimestamp, Long serverTimestamp) {
        if (clientTimestamp == null) {
            return serverTimestamp.toString();
        }
        
        // 检查客户端时间戳是否合理（与服务器时间相差不超过5分钟）
        long timeDiff = Math.abs(serverTimestamp - clientTimestamp);
        if (timeDiff > 5 * 60 * 1000) { // 5分钟
            log.warn("客户端时间戳异常，使用服务端时间戳: client={}, server={}", clientTimestamp, serverTimestamp);
            return serverTimestamp.toString();
        }
        
        return clientTimestamp.toString();
    }

    /**
     * 检查消息是否已存在（幂等性检查）
     */
    private boolean isMessageExists(MessageReq dto) {
        return false;
/*        Query query = new Query(Criteria.where("clientMessageId").is(dto.getMessageId())
                .and("senderId").is(dto.getFromUserId()));
        
        return mongoTemplate.exists(query, MessageMailboxDocument.class);*/
    }
}
