package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.session.domain.document.MessageDoc;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class ChatSendEvent extends ApplicationEvent {
    private MessageDoc userMail;
    private List<Long> uidList;

    public ChatSendEvent(Object source, MessageDoc userMail, List<Long> uidList) {
        super(source);
        this.userMail = userMail;
        this.uidList = uidList;
    }
}
