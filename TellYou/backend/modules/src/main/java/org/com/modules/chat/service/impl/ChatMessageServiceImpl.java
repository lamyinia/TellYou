package org.com.modules.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.chat.domain.dto.ChatMessageDTO;
import org.com.modules.chat.service.ChatMessageService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {
    private final RocketMQTemplate rocketMQTemplate;
    @Override
    public void handleMessage(ChatMessageDTO dto) {

    }
}
