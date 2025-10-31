package org.com.modules.deliver.event.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.deliver.event.AggregateEvent;
import org.com.modules.mail.producer.AggregateProducer;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 聚合链路 AggregateListener -> AggregateProducer -> AggregateConsumer -> ChatConsumer -> ChatSendListener -> dispatch
 * @author lanye
 * @since 2025/10/21
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AggregateListener {
    private final AggregateProducer aggregateProducer;

    @EventListener
    public void handleAggregateEvent(AggregateEvent event) {
        try {
            aggregateProducer.produceAggregateEvent(event.getAggregateDTO());
            log.debug("处理聚合事件成功，群组: {}", event.getAggregateDTO().getGroupId());
        } catch (Exception e) {
            log.error("处理聚合事件失败", e);
            throw e;
        }
    }
}
