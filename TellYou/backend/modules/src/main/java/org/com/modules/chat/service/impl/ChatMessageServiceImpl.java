package org.com.modules.chat.service.impl;

import lombok.RequiredArgsConstructor;
import org.com.modules.chat.domain.dto.ChatMessageDTO;
import org.com.modules.chat.service.ChatMessageService;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {
    private final ChannelManagerUtil channelManagerUtil;

    @Override
    public void handleMessage(ChatMessageDTO dto) {

    }
}
