package org.com.modules.common.event;

import lombok.Getter;
import org.com.modules.user.domain.entity.ContactApply;
import org.springframework.context.ApplicationEvent;

import java.util.List;

@Getter
public class ApplyEvent extends ApplicationEvent {

    private ContactApply contactApply;

    private List<Long> uidList;

    public ApplyEvent(Object source, ContactApply contactApply, List<Long> uidList) {
        super(source);
        this.contactApply = contactApply;
        this.uidList = uidList;
    }

}
