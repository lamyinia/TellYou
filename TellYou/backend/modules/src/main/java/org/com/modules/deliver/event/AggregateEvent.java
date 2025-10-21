package org.com.modules.deliver.event;

import lombok.Getter;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.springframework.context.ApplicationEvent;

/**
 * 聚合事件
 * @author lanye
 * @since 2025/10/21
 */
@Getter
public class AggregateEvent extends ApplicationEvent {
    private final AggregateDTO aggregateDTO;

    public AggregateEvent(Object source, AggregateDTO aggregateDTO) {
        super(source);
        this.aggregateDTO = aggregateDTO;
    }
}
