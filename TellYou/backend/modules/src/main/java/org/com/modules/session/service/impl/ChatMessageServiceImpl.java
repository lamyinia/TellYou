package org.com.modules.session.service.impl;

import lombok.RequiredArgsConstructor;
import org.com.modules.session.domain.vo.req.MessageReq;
import org.com.modules.session.service.ChatMessageService;
import org.com.tools.utils.ChannelManagerUtil;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {
    private final ChannelManagerUtil channelManagerUtil;

    @Override
    public void handleMessage(MessageReq dto) {

    }
}
