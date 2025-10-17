package org.com.modules.session.service;

import org.com.modules.session.domain.document.MessageDoc;

import java.util.List;

public interface MailBoxService {

    MessageDoc insertChatMessage(MessageDoc req, List<Long> uidList);

}
