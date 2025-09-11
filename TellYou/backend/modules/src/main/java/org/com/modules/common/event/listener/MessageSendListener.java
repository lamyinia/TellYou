package org.com.modules.common.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.common.event.MessageSendEvent;
import org.com.modules.common.service.dispatch.DispatcherService;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.session.service.adapter.MessageAdapter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class MessageSendListener {
    private final DispatcherService dispatcherService;

    @Async
    @TransactionalEventListener(classes = MessageSendEvent.class, fallbackExecution = true)
    public void notifyUser(MessageSendEvent event){
        MessageResp resp = MessageAdapter.buildVo(event.getDocument());
        dispatcherService.dispatch(DeliveryEnum.MESSAGE, resp, event.getUidList());
    }
}
