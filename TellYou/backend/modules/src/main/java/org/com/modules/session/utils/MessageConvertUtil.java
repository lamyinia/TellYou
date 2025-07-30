package org.com.modules.session.utils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.domain.document.MessageMailBox;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.modules.session.domain.vo.resp.MessageResp;
import org.com.modules.session.service.MessageMailBoxService;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MessageConvertUtil {
    private final MessageMailBoxService messageMailBoxService;

    public MessageMailBox covertToDocumentAndSave(MessageReq dto) {
        return messageMailBoxService.save(dto);
    }

    public MessageResp covertToVO(MessageMailBox document) {
        return null;
    }
}
