package org.com.modules.session.service;

import org.com.modules.session.domain.vo.req.MessageReq;

public interface ChatMessageService {
    void handleMessage(MessageReq dto);
}
