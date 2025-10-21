package org.com.modules.mail.service.impl;

import com.alibaba.fastjson.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.mail.dao.mongodb.MessageDocDao;
import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.mail.domain.document.UserInBoxDoc;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.modules.mail.service.MailBoxService;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.vo.resp.SimpleUserInfo;
import org.springframework.beans.BeanUtils;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailBoxServiceImpl implements MailBoxService {
    private final MessageDocDao messageDocDao;
    private final UserInfoDao userInfoDao;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MessageDoc insertChatMessage(MessageDoc messageDoc, List<Long> uidList) {
        messageDocDao.save(messageDoc);

        List<UserInBoxDoc> inboxList = uidList.stream().map(id -> {
            UserInBoxDoc userInBoxDoc = new UserInBoxDoc();
            BeanUtils.copyProperties(messageDoc, userInBoxDoc);
            userInBoxDoc.setQuoteId(messageDoc.getMessageId());
            userInBoxDoc.setQuoteType(messageDoc.getMessageType());
            userInBoxDoc.setUserId(id);

            // 聊天信息的额外信息，会话自增 id
            Map<String, Object> extra = userInBoxDoc.getExtra();
            if (extra == null) extra = new HashMap<>();
            extra.put("sequenceId", messageDoc.getSequenceNumber());
            userInBoxDoc.setExtra(extra);

            return userInBoxDoc;
        }).collect(Collectors.toList());

        messageDocDao.batchSave(inboxList);

        return messageDoc;
    }

    @Override
    public Message<String> produceChatDTO(AggregateDTO aggregateDTO, List<Long> userIds) {
        List<SimpleUserInfo> baseInfoLists = userInfoDao.getBaseInfoList(userIds);
        String names = baseInfoLists.stream().map(SimpleUserInfo::getNickname).collect(Collectors.joining(","));
        ChatDTO chatDTO = ChatDTO.builder()
                .fromUserId(0L)
                .targetId(aggregateDTO.getGroupId())
                .sessionId(aggregateDTO.getSessionId())
                .type(aggregateDTO.getAggregateType())
                .content(names)
                .build();

        return MessageBuilder
                .withPayload(JSON.toJSONString(chatDTO)).build();
    }
}
