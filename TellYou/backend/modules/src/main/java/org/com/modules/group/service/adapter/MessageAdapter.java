package org.com.modules.group.service.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.contact.dao.mongodb.SessionDocDao;
import org.com.modules.mail.domain.document.MessageDoc;
import org.com.modules.mail.domain.document.UserInBoxDoc;
import org.com.modules.mail.domain.dto.ChatDTO;
import org.com.modules.deliver.domain.vo.push.PushedChat;
import org.com.modules.user.dao.UserInfoDao;
import org.com.tools.utils.JsonUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageAdapter {
    private final SessionDocDao mongoSessionDocDao;
    private final UserInfoDao userInfoDao;

    public static PushedChat mailToMessageResp(UserInBoxDoc doc) {
        PushedChat resp = new PushedChat();
        resp.setMessageId(doc.getQuoteId());
        resp.setSessionId(doc.getSessionId());

        Long sequenceId = (Long) doc.getExtra().get("sequenceId");
        if (sequenceId != null) resp.setSequenceNumber(sequenceId);
        else resp.setSequenceNumber(System.currentTimeMillis());

        resp.setMessageType(doc.getQuoteType());
        resp.setSenderId(doc.getSenderId());
        resp.setReceiverId(doc.getUserId());
        resp.setContent(doc.getContent());
        resp.setAdjustedTimestamp(doc.getAdjustedTimestamp());
        resp.setExtra(doc.getExtra());
        return resp;
    }

    public MessageDoc buildMessage(ChatDTO req) {
        Long sequenceId = mongoSessionDocDao.getAndIncrementSequenceId(req.getSessionId());
        Long currentTime = System.currentTimeMillis();
        Map<String, Object> identifier = JsonUtils.toMap(userInfoDao.getIdentifierById(req.getFromUserId()));
        if (identifier != null) {
            identifier.forEach((key, value) -> {
                req.getExtra().put(key, value);
            });
        }

        return MessageDoc.builder()
                .sessionId(req.getSessionId())
                .clientMessageId(req.getMessageId())
                .sequenceNumber(sequenceId)
                .messageType(req.getType())
                .senderId(req.getFromUserId())
                .content(req.getContent())
                .adjustedTimestamp(calculateAdjustedTimestamp(req.getTimestamp(), currentTime))
                .createTime(currentTime)
                .updateTime(currentTime)
                .extra(req.getExtra())
                .build();
    }

    public static PushedChat buildVo(MessageDoc messageDoc) {
        PushedChat resp = new PushedChat();
        BeanUtils.copyProperties(messageDoc, resp);
        return resp;
    }

    private String calculateAdjustedTimestamp(Long clientTimestamp, Long serverTimestamp) {
        if (clientTimestamp == null) {
            return serverTimestamp.toString();
        }

        long timeDiff = Math.abs(serverTimestamp - clientTimestamp);
        if (timeDiff > 5 * 60 * 1000) { // 5分钟
            log.warn("客户端时间戳异常，使用服务端时间戳: client={}, server={}", clientTimestamp, serverTimestamp);
            return serverTimestamp.toString();
        }

        return clientTimestamp.toString();
    }
}
