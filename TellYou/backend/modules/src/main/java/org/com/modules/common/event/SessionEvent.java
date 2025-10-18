package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.user.domain.vo.push.PushedSession;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class SessionEvent extends ApplicationEvent {
    private PushedSession pushedSession;
    private List<Long> uidList;

    public SessionEvent(Object source, PushedSession pushedSession, List<Long> uidList) {
        super(source);
        this.pushedSession = pushedSession;
        this.uidList = uidList;
    }
}
