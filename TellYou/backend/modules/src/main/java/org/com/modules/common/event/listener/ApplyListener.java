package org.com.modules.common.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.common.event.ApplyEvent;
import org.com.modules.common.service.dispatch.DispatcherService;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.vo.push.PushedApply;
import org.springframework.beans.BeanUtils;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ApplyListener {
    private final DispatcherService dispatcherService;

    @Async
    @TransactionalEventListener(classes = ApplyEvent.class, fallbackExecution = true)
    public void notifyUser(ApplyEvent event){
        PushedApply resp = new PushedApply();
        BeanUtils.copyProperties(event.getContactApply(), resp);
        dispatcherService.dispatch(DeliveryEnum.APPLY, resp, event.getUidList());
    }
}
