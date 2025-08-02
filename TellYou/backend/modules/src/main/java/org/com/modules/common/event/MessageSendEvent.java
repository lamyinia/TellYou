package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.common.domain.document.MessageMailboxDocument;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class MessageSendEvent extends ApplicationEvent {
    private MessageMailboxDocument document;
    private List<Long> uidList = null;

    public MessageSendEvent(Object source, MessageMailboxDocument document) {
        super(source);
        this.document = document;
    }
    public MessageSendEvent(Object source, MessageMailboxDocument document, List<Long> uidList) {
        super(source);
        this.document = document;
        this.uidList = uidList;
    }
}
