package org.com.modules.user.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.event.FriendApplyEvent;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.session.dao.SessionDao;
import org.com.modules.session.domain.entity.Session;
import org.com.modules.user.dao.ContactApplyDao;
import org.com.modules.user.dao.FriendContactDao;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.entity.FriendContact;
import org.com.modules.user.domain.enums.ConfirmEnum;
import org.com.modules.user.domain.vo.req.AcceptFriendApplyReq;
import org.com.modules.user.domain.vo.req.FriendApplyReq;
import org.com.modules.user.service.UserContactService;
import org.com.modules.user.service.adapter.ApplyContactAdapter;
import org.com.modules.user.service.adapter.FriendContactAdapter;
import org.com.modules.user.service.adapter.SessionAdapter;
import org.com.tools.exception.BusinessException;
import org.com.tools.utils.AssertUtil;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserContactServiceImpl implements UserContactService {
    private final ContactApplyDao contactApplyDao;
    private final FriendContactDao friendContactDao;
    private final SessionDao sessionDao;
    private final MongoSessionDao mongoSessionDao;

    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @RedissonLocking(key = "#uid")
    public void friendApplySend(Long uid, FriendApplyReq friendApplyReq) {
        if (uid == friendApplyReq.getContactId()) return;

        AssertUtil.isEmpty(friendContactDao.getContactByBothId(uid, friendApplyReq.getContactId()), "你们已经是好友了");
        AssertUtil.isEmpty(contactApplyDao.getApplyByBothId(uid, friendApplyReq.getContactId()), "你已经发送过好友申请了");
        AssertUtil.isEmpty(contactApplyDao.getApplyByBothId(friendApplyReq.getContactId(), uid), "对方已经向你发送过好友申请，请检查通知");

        ContactApply contactApply = ApplyContactAdapter.buildFriendApply(uid, friendApplyReq);
        contactApplyDao.save(contactApply);
        applicationEventPublisher.publishEvent(new FriendApplyEvent(this, contactApply, List.of(uid, friendApplyReq.getContactId())));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void applyAccept(AcceptFriendApplyReq req) {
        ContactApply byId = contactApplyDao.getById(req.getApplyId());
        AssertUtil.isTrue(byId != null && byId.getContactType() == 0 && byId.getApplyUserId().equals(req.getFromUid()), "申请参数错误");

        byId.setStatus(ConfirmEnum.ACCEPTED.getStatus());
        contactApplyDao.updateById(byId);
        FriendContact byBothId = friendContactDao.findByBothId(byId.getApplyUserId(), byId.getTargetId());
        if (byBothId == null){
            Session session = SessionAdapter.buildDefaultFrinedSession();
            sessionDao.save(session);
            List<FriendContact> list = FriendContactAdapter.buildFriendContact(session.getSessionId(), byId.getApplyUserId(), byId.getTargetId());
            mongoSessionDao.insert(session);
            mongoSessionDao.updateLastMessage(session.getSessionId(), 3L, "发出好友申请", new Date());
            friendContactDao.saveBatch(list);
        } else {

        }

        boolean success = true;
    }

    void buildContact(Session session, ContactApply contactApply){

    }
}
