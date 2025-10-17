package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.session.domain.document.MessageDoc;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class MessageSendEvent extends ApplicationEvent {
    private MessageDoc userMail;
    private List<Long> uidList = null;

    public MessageSendEvent(Object source, MessageDoc userMail) {
        super(source);
        this.userMail = userMail;
    }
    public MessageSendEvent(Object source, MessageDoc userMail, List<Long> uidList) {
        super(source);
        this.userMail = userMail;
        this.uidList = uidList;
    }
}
