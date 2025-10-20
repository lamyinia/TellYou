package org.com.modules.mail.service;

import org.com.modules.mail.domain.document.MessageDoc;

import java.util.List;

public interface MailBoxService {

    MessageDoc insertChatMessage(MessageDoc req, List<Long> uidList);

}
