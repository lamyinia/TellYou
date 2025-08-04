package org.com.modules.session.utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.document.MessageMailboxDocument;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.common.service.mailbox.MessageMailboxService;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MessageConvertUtil {
    private final MessageMailboxService messageMailboxService;

    public MessageMailboxDocument covertToDocumentAndSave(MessageReq req) {
        return messageMailboxService.save(req);
    }

    public MessageResp covertToVO(MessageMailboxDocument document) {
        MessageResp resp = new MessageResp();
        BeanUtils.copyProperties(document, resp);
        resp.setToUserId(-1L);
        return resp;
    }
}
