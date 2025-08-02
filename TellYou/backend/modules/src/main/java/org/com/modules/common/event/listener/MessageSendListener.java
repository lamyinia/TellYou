package org.com.modules.common.event.listener;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.enums.DeliveryEnum;
import org.com.modules.common.event.MessageSendEvent;
import org.com.modules.common.service.dispatch.DispatcherService;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.session.utils.MessageConvertUtil;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
public class MessageSendListener {
    private final DispatcherService dispatcherService;
    private final MessageConvertUtil messageConvertUtil;

    @Async
    @TransactionalEventListener(classes = MessageSendEvent.class, fallbackExecution = true)
    public void notifyUser(MessageSendEvent event){
        List<Long> uidList = getUidList(event);
        MessageResp resp = messageConvertUtil.covertToVO(event.getDocument());

        dispatcherService.dispatch(DeliveryEnum.MESSAGE, resp, uidList);
    }

    private List<Long> getUidList(MessageSendEvent event){
        if (event.getUidList() == null){
            // TODO 群聊的 id 就去查 Session
        }
        return event.getUidList();
    }
}
