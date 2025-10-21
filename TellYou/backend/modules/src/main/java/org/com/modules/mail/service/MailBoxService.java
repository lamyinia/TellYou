package org.com.modules.mail.service;

import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.springframework.messaging.Message;

import java.util.List;

public interface MailBoxService {
    MessageDoc insertChatMessage(MessageDoc req, List<Long> uidList);

    Message<String> produceChatDTO(AggregateDTO dto, List<Long> userIds);
}
