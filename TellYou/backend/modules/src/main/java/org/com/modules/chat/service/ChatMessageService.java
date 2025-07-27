package org.com.modules.chat.service;

import org.com.modules.chat.domain.dto.MessageDTO;

public interface ChatMessageService {
    void handleMessage(MessageDTO dto);
}
