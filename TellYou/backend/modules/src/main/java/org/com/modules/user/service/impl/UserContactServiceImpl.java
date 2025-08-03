package org.com.modules.user.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.event.FriendApplyEvent;
import org.com.modules.common.service.lock.LockService;
import org.com.modules.user.dao.ContactApplyDao;
import org.com.modules.user.dao.FriendContactDao;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.vo.req.FriendApplyReq;
import org.com.modules.user.service.UserContactService;
import org.com.modules.user.service.adapter.FriendContactAdapter;
import org.com.tools.utils.AssertUtil;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserContactServiceImpl implements UserContactService {
    private final ContactApplyDao contactApplyDao;
    private final FriendContactDao friendContactDao;
    private final LockService lockService;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @RedissonLocking(key = "#uid")
    public void friendApplySend(Long uid, FriendApplyReq friendApplyReq) {
        if (uid == friendApplyReq.getContactId()) return;

        AssertUtil.isEmpty(friendContactDao.getContactByBothId(uid, friendApplyReq.getContactId()), "你们已经是好友了");
        AssertUtil.isEmpty(contactApplyDao.getApplyByBothId(uid, friendApplyReq.getContactId()), "你已经发送过好友申请了");
        AssertUtil.isEmpty(contactApplyDao.getApplyByBothId(friendApplyReq.getContactId(), uid), "对方已经向你发送过好友申请，请检查通知");

        ContactApply contactApply = FriendContactAdapter.buildFriendApply(uid, friendApplyReq);
        contactApplyDao.save(contactApply);
        applicationEventPublisher.publishEvent(new FriendApplyEvent(this, contactApply, List.of(uid, friendApplyReq.getContactId())));
    }
}
