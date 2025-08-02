package org.com.modules.common.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.common.event.FriendApplyEvent;
import org.com.modules.common.service.dispatch.DispatcherService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class FriendApplyListener {
    private final DispatcherService dispatcherService;

    @Async
    @TransactionalEventListener(classes = FriendApplyEvent.class, fallbackExecution = true)
    public void notifyUser(FriendApplyEvent event){
        dispatcherService.dispatch(DeliveryEnum.APPLY, event.getContactApply(), event.getUidList());
    }
}
