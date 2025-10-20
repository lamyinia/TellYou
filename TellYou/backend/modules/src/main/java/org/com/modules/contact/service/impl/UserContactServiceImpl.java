package org.com.modules.contact.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.common.util.SnowFlakeUtil;
import org.com.modules.contact.dao.mysql.SessionDao;
import org.com.modules.contact.domain.vo.req.*;
import org.com.modules.deliver.event.ApplyEvent;
import org.com.modules.deliver.event.SessionEvent;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.contact.dao.mongodb.SessionDocDao;
import org.com.modules.contact.domain.entity.Session;
import org.com.modules.group.domain.vo.resp.ContactResp;
import org.com.modules.contact.domain.enums.SessionEventEnum;
import org.com.modules.deliver.domain.vo.push.PushedSession;
import org.com.modules.contact.domain.vo.resp.PullFriendContactResp;
import org.com.modules.contact.dao.mysql.BlackDao;
import org.com.modules.contact.dao.mysql.ApplyDao;
import org.com.modules.contact.dao.mysql.FriendContactDao;
import org.com.modules.contact.domain.entity.Black;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.entity.FriendContact;
import org.com.modules.contact.domain.enums.ConfirmEnum;
import org.com.modules.contact.domain.enums.ContactTypeEnum;
import org.com.modules.contact.domain.vo.resp.FriendContactResp;
import org.com.modules.contact.service.UserContactService;
import org.com.modules.contact.service.adapter.ContactApplyAdapter;
import org.com.modules.contact.service.adapter.BlackAdapter;
import org.com.modules.contact.service.adapter.FriendContactAdapter;
import org.com.modules.contact.service.adapter.SessionAdapter;
import org.com.tools.utils.AssertUtil;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserContactServiceImpl implements UserContactService {
    private final ApplyDao applyDao;
    private final FriendContactDao friendContactDao;
    private final GroupContactDao groupContactDao;
    private final SessionDao sessionDao;
    private final BlackDao blackDao;
    private final SessionDocDao mongoSessionDocDao;
    private final SnowFlakeUtil snowFlakeUtil;

    private final ApplicationEventPublisher applicationEventPublisher;

    /**
     * 业务判断，数据入库，本机发布投递申请表的 spring-event 事件
     */
    @Override
    @RedissonLocking(key = "#uid")
    public void friendApplySend(Long uid, FriendApplyReq friendApplyReq) {
        if (uid == friendApplyReq.getContactId()) return;

        AssertUtil.isEmpty(friendContactDao.getContactByBothId(uid, friendApplyReq.getContactId()), "你们已经是好友了");
        AssertUtil.isEmpty(applyDao.getFriendApply(uid, friendApplyReq.getContactId()), "你已经发送过好友申请了");
        AssertUtil.isEmpty(applyDao.getFriendApply(friendApplyReq.getContactId(), uid), "对方已经向你发送过好友申请，请检查通知");

        ContactApply contactApply = ContactApplyAdapter.buildFriendApply(uid, friendApplyReq);
        applyDao.save(contactApply);
        applicationEventPublisher.publishEvent(new ApplyEvent(this, contactApply, List.of(uid, friendApplyReq.getContactId())));
    }

    @Override
    @Transactional(value = "mongoTransactionManager", rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void applyAccept(AcceptFriendApplyReq req) {
        ContactApply apply = applyDao.getById(req.getApplyId());

        AssertUtil.isTrue(apply != null && apply.getContactType() == 1, "申请参数错误");
        AssertUtil.isTrue(apply.getStatus() == ConfirmEnum.WAITING.getStatus(), "你已经接收过这个好友申请了");

        apply.setStatus(ConfirmEnum.ACCEPTED.getStatus());
        applyDao.updateById(apply);

        Long uid1 = apply.getApplyUserId(), uid2 = apply.getTargetId();

        FriendContact contact = friendContactDao.findByBothId(uid1, uid2);
        if (contact == null) {
            Session session = SessionAdapter.buildDefaultFrinedSession();
            session.setSessionId(snowFlakeUtil.nextId());
            mongoSessionDocDao.save(session);

            List<FriendContact> list = FriendContactAdapter.buildFriendContact(session.getSessionId(), uid1, uid2);
            contact = new FriendContact();
            contact.setSessionId(session.getSessionId());
            friendContactDao.saveBatch(list);
        } else {
            Long sessionId = contact.getSessionId();
            mongoSessionDocDao.updateStatus(sessionId, YesOrNoEnum.NO.getStatus());
            friendContactDao.rebuildContact(uid1, uid2);
        }
//        if (true) throw new RuntimeException("测试错误");
        PushedSession pushed1 = new PushedSession(contact.getSessionId(), uid1, uid2, SessionEventEnum.BUILD.getStatus(), System.currentTimeMillis());
        PushedSession pushed2 = new PushedSession(contact.getSessionId(), uid2, uid1, SessionEventEnum.BUILD.getStatus(), System.currentTimeMillis());

        applicationEventPublisher.publishEvent(new ApplyEvent(this, apply, List.of(uid1, uid2)));
        applicationEventPublisher.publishEvent(new SessionEvent(this, pushed1, List.of(uid2)));  // uid2 的会话创建
        applicationEventPublisher.publishEvent(new SessionEvent(this, pushed2, List.of(uid1)));  // uid1 的会话创建
    }

    @Override
    public void pullBlackList(PullBlackListReq req) {
        AssertUtil.isTrue(req.getFromType() == ContactTypeEnum.FRIEND.getStatus(), "参数错误");

        Long uid = req.getFromId(), target = req.getTargetId();
        Black black = blackDao.findBlack(uid, target, ContactTypeEnum.FRIEND.getStatus());
        if (black == null) {
            black = BlackAdapter.buildBlackContact(uid, target, ContactTypeEnum.FRIEND.getStatus());
            blackDao.save(black);
        } else {
            AssertUtil.isTrue(black.getIsDeleted() == YesOrNoEnum.YES.getStatus(), "对象已经进入黑名单了");
            black.setBlackVersion(black.getBlackVersion() + 1);
            black.setIsDeleted(YesOrNoEnum.NO.getStatus());
            blackDao.updateById(black);
        }
    }

    @Override
    public void removeBlackList(RemoveBlackListReq req) {
        Black black = blackDao.getById(req.getBlackId());
        AssertUtil.isTrue(black != null && black.getFromId().equals(req.getFromUid()), "参数错误");
        AssertUtil.isTrue(black.getIsDeleted() == YesOrNoEnum.NO.getStatus(), "对象已经移除黑名单了");

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
        mongoSessionDocDao.abandon(sessionId);
    }

    @Override
    public CursorPageResp<FriendContactResp> friendListPage(CursorPageReq req) {
        Long uid = RequestHolder.get().getUid();

        CursorPageResp<FriendContact> friendPage = friendContactDao.getFriendPage(uid, req);
        if (CollectionUtil.isEmpty(friendPage.getList())){
            return CursorPageResp.empty();
        }
        List<FriendContactResp> friendList = friendPage.getList().stream()
                .map(contact -> {
                    FriendContactResp resp = new FriendContactResp();
                    resp.setContactId(contact.getContactId());
                    return resp;
                }).collect(Collectors.toList());

        return CursorPageResp.init(friendPage, friendList);
    }

    @Override
    public PullFriendContactResp pullFriendContact(Long uid) {
        List<ContactResp> resp = new ArrayList<>();
        resp.addAll(friendContactDao.selectFriendContactById(uid));
        resp.addAll(groupContactDao.selectGroupContactById(uid));
        return new PullFriendContactResp(resp);
    }

    @Override
    public CursorPageResp<ContactApply> ApplyInfoListByCursor(CursorPageReq req) {
        Long uid = RequestHolder.get().getUid();
        return applyDao.selectApplyByIdAndCursor(req, uid);
    }
}
