package org.com.store.infrastructure.outbox;

import com.alibaba.fastjson2.JSON;
import org.com.store.infrastructure.persistence.po.MessageDO;
import org.com.store.infrastructure.persistence.po.OutboxEventDO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class OutboxEventFactory {

    public static final int STATUS_PENDING = 0;
    public static final int STATUS_SENT = 1;
    public static final int STATUS_FAILED = 2;

    @Value("${rocketmq.topic.message-persisted:im_message_persisted}")
    private String messagePersistedTopic;

    public OutboxEventDO createMessagePersistedEvent(
            MessageDO message,
            String clientMessageId,
            long clientTimeMs,
            long serverTimeMs,
            String traceId
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("event", "MESSAGE_PERSISTED");
        body.put("msgId", message.getMsgId());
        body.put("clientMessageId", clientMessageId);
        body.put("sessionId", message.getSessionId());
        body.put("senderId", message.getSenderId());
        body.put("partitionId", message.getPartitionId());
        body.put("seq", message.getSeq());
        body.put("type", message.getMsgType());
        body.put("appearance", message.getAppearance());
        body.put("content", message.getContent());
        body.put("clientTimeMs", clientTimeMs);
        body.put("serverTimeMs", serverTimeMs);
        body.put("traceId", traceId);

        OutboxEventDO outbox = new OutboxEventDO();
        outbox.setEventType("MESSAGE_PERSISTED");
        outbox.setTopic(messagePersistedTopic);
        outbox.setKeys(String.valueOf(message.getMsgId()));
        outbox.setBody(JSON.toJSONString(body));
        outbox.setStatus(STATUS_PENDING);
        outbox.setRetryCount(0);
        outbox.setNextRetryAt(null);

        LocalDateTime now = LocalDateTime.now();
        outbox.setCreatedAt(now);
        outbox.setUpdatedAt(now);
        return outbox;
    }
}
