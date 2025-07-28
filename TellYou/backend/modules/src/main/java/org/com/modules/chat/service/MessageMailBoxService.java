package org.com.modules.chat.service;

import org.com.modules.chat.domain.document.MessageMailBox;
import org.com.modules.chat.domain.dto.MessageDTO;

public interface MessageMailBoxService {

    MessageMailBox save(MessageDTO dto);
}
