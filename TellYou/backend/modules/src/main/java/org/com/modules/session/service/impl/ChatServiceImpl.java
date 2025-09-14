package org.com.modules.session.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.session.dao.MessageDocDao;
import org.com.modules.session.domain.document.MessageDoc;
import org.com.modules.session.domain.document.UserInBoxDoc;
import org.com.modules.session.service.ChatService;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private final MessageDocDao messageDocDao;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageDoc save(MessageDoc messageDoc, List<Long> uidList) {
        messageDocDao.save(messageDoc);

        List<UserInBoxDoc> inboxList = uidList.stream().map(id -> {
            UserInBoxDoc userInBoxDoc = new UserInBoxDoc();
            BeanUtils.copyProperties(messageDoc, userInBoxDoc);
            userInBoxDoc.setQuoteId(messageDoc.getMessageId());
            userInBoxDoc.setQuoteType(messageDoc.getMessageType());
            userInBoxDoc.setUserId(id);
            return userInBoxDoc;
        }).collect(Collectors.toList());

        messageDocDao.batchSave(inboxList);

        return messageDoc;
    }
}
