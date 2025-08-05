package org.com.modules.user.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.common.event.FriendApplyEvent;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.session.dao.SessionDao;
import org.com.modules.session.domain.entity.Session;
import org.com.modules.user.dao.BlackDao;
import org.com.modules.user.dao.ContactApplyDao;
import org.com.modules.user.dao.FriendContactDao;
import org.com.modules.user.domain.entity.Black;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.entity.FriendContact;
import org.com.modules.user.domain.enums.ConfirmEnum;
import org.com.modules.user.domain.enums.ContactTypeEnum;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.user.domain.vo.resp.FriendContactResp;
import org.com.modules.user.service.UserContactService;
import org.com.modules.user.service.adapter.ApplyContactAdapter;
import org.com.modules.user.service.adapter.BlackAdapter;
import org.com.modules.user.service.adapter.FriendContactAdapter;
import org.com.modules.user.service.adapter.SessionAdapter;
import org.com.tools.utils.AssertUtil;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserContactServiceImpl implements UserContactService {
    private final ContactApplyDao contactApplyDao;
    private final FriendContactDao friendContactDao;
    private final SessionDao sessionDao;
    private final MongoSessionDao mongoSessionDao;
    private final BlackDao blackDao;

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
        ContactApply apply = contactApplyDao.getById(req.getApplyId());
        AssertUtil.isTrue(apply != null && apply.getContactType() == 0, "申请参数错误");

        apply.setStatus(ConfirmEnum.ACCEPTED.getStatus());
        contactApplyDao.updateById(apply);

        Long uid1 = apply.getApplyUserId(), uid2 = apply.getTargetId();

        FriendContact contact = friendContactDao.findByBothId(uid1, uid2);
        if (contact == null) {
            Session session = SessionAdapter.buildDefaultFrinedSession();
            sessionDao.save(session);
            List<FriendContact> list = FriendContactAdapter.buildFriendContact(session.getSessionId(), uid1, uid2);
            mongoSessionDao.insert(session);
            friendContactDao.saveBatch(list);
        } else {
            Long sessionId = contact.getSessionId();
            sessionDao.updateStatus(sessionId, YesOrNoEnum.NO.getStatus());
            mongoSessionDao.updateStatus(sessionId, YesOrNoEnum.NO.getStatus());
            friendContactDao.rebuildContact(uid1, uid2);
        }

        applicationEventPublisher.publishEvent(new FriendApplyEvent(this, apply, List.of(uid1, uid2)));
    }

    @Override
    public void pullBlackList(PullBlackListReq req) {
        AssertUtil.isTrue(req.getFromType() == ContactTypeEnum.FRIEND.getStatus(), "参数错误");

        Long uid = req.getBlackId(), target = req.getBlackId();
        Black black = blackDao.findBlack(uid, target, ContactTypeEnum.FRIEND.getStatus());
        if (black == null) {
            black = BlackAdapter.buildBlackContact(uid, target, ContactTypeEnum.FRIEND.getStatus());
            blackDao.save(black);
        } else {
            black.setBlackVersion(black.getBlackVersion() + 1);
            black.setIsDeleted(YesOrNoEnum.NO.getStatus());
            blackDao.updateById(black);
        }
    }

    @Override
    public void removeBlackList(RemoveBlackListReq req) {
        Black black = blackDao.getById(req.getBlackId());
        AssertUtil.isTrue(black != null && black.getFromId().equals(req.getFromId()), "参数错误");

        black.setIsDeleted(YesOrNoEnum.YES.getStatus());
        blackDao.updateById(black);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void deleContact(DeleteContactReq req) {
        FriendContact contact1 = friendContactDao.getContactByBothId(req.getUserId(), req.getContactId());
        FriendContact contact2 = friendContactDao.getContactByBothId(req.getContactId(), req.getUserId());
        AssertUtil.isTrue(contact1 != null && contact2 != null, "参数错误");

        friendContactDao.abandon(contact1);
        friendContactDao.abandon(contact2);

        Long sessionId = contact1.getSessionId();
        sessionDao.abandon(sessionId);
        mongoSessionDao.abandon(sessionId);
    }

    @Override
    public CursorPageResp<FriendContactResp> friendList(CursorPageReq req) {
        return null;
    }
}
