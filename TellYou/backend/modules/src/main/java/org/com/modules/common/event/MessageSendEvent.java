package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.session.domain.document.MessageDoc;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class MessageSendEvent extends ApplicationEvent {
    private MessageDoc document;
    private List<Long> uidList = null;

    public MessageSendEvent(Object source, MessageDoc document) {
        super(source);
        this.document = document;
    }
    public MessageSendEvent(Object source, MessageDoc document, List<Long> uidList) {
        super(source);
        this.document = document;
        this.uidList = uidList;
    }
}
