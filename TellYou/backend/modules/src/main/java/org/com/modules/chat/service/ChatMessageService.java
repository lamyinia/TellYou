package org.com.modules.chat.service;

import org.com.modules.chat.domain.dto.ChatMessageDTO;

public interface ChatMessageService {
    void handleMessage(ChatMessageDTO dto);
}
