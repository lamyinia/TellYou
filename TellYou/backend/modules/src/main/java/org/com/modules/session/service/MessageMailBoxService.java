package org.com.modules.session.service;

import org.com.modules.session.domain.document.MessageMailBox;
import org.com.modules.session.domain.vo.req.MessageReq;

public interface MessageMailBoxService {

    MessageMailBox save(MessageReq dto);
}
