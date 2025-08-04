package org.com.modules.common.service.mailbox;

import org.com.modules.common.domain.document.MessageMailboxDocument;
import org.com.modules.session.domain.vo.req.MessageReq;

public interface MessageMailboxService {

    MessageMailboxDocument save(MessageReq req);
}
