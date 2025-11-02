package org.com.modules.mail.service;

import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.springframework.messaging.Message;

import java.util.List;

public interface MailBoxService {
    MessageDoc insertChatMessage(MessageDoc req, List<Long> uidList);

    Message<String> aggregateDTOConvertChatDTO(AggregateDTO dto, List<Long> userIds);
}
