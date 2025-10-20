package org.com.modules.deliver.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.deliver.domain.enums.DeliveryEnum;
import org.com.modules.deliver.event.SessionEvent;
import org.com.modules.deliver.service.dispatch.DispatcherService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class SessionListener {
    private final DispatcherService dispatcherService;

    @Async
    @TransactionalEventListener(classes = SessionEvent.class, fallbackExecution = true)
    public void notifyUser(SessionEvent event){
        dispatcherService.dispatch(DeliveryEnum.SESSION, event.getPushedSession(), event.getUidList());
    }
}
