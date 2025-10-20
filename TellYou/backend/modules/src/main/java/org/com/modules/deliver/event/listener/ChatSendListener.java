package org.com.modules.deliver.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.deliver.domain.enums.DeliveryEnum;
import org.com.modules.deliver.event.ChatSendEvent;
import org.com.modules.deliver.service.dispatch.DispatcherService;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.modules.group.service.adapter.MessageAdapter;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ChatSendListener {
    private final DispatcherService dispatcherService;

    @Async
    @TransactionalEventListener(classes = ChatSendEvent.class, fallbackExecution = true)
    public void notifyUser(ChatSendEvent event){
        PushedChat resp = MessageAdapter.buildVo(event.getUserMail());
        dispatcherService.dispatch(DeliveryEnum.MESSAGE, resp, event.getUidList());
    }
}
