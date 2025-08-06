package org.com.modules.session.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.session.dao.GroupContactDao;
import org.com.modules.session.dao.GroupInfoDao;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.session.dao.SessionDao;
import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.domain.entity.GroupInfo;
import org.com.modules.session.domain.entity.Session;
import org.com.modules.session.domain.enums.GroupRoleEnum;
import org.com.modules.session.domain.vo.req.CreateGroupReq;
import org.com.modules.session.domain.vo.req.GroupApplyReq;
import org.com.modules.session.domain.vo.req.InviteFriendReq;
import org.com.modules.session.service.GroupContactService;
import org.com.modules.session.service.adapter.GroupContactAdapter;
import org.com.modules.session.service.adapter.GroupInfoAdapter;
import org.com.modules.session.service.adapter.SessionAdapter;
import org.com.modules.user.dao.ContactApplyDao;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.service.adapter.ContactApplyAdapter;
import org.com.tools.constant.GroupConstant;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
import org.com.tools.utils.AssertUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupContactServiceImpl implements GroupContactService {
    private final GroupContactDao groupContactDao;
    private final GroupInfoDao groupInfoDao;
    private final ContactApplyDao contactApplyDao;
    private final SessionDao sessionDao;
    private final MongoSessionDao mongoSessionDao;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void createGroup(CreateGroupReq req) {
        Session session = SessionAdapter.buildDefaultGroupSession();
        sessionDao.save(session);
        mongoSessionDao.insert(session);
        GroupInfo groupInfo = GroupInfoAdapter.buildDefaultGroup(req.getFromUid(), session.getSessionId(), req.getName());
        groupInfoDao.save(groupInfo);

        GroupContact groupContact = GroupContactAdapter.buildDefaultContact(req.getFromUid(), groupInfo.getId(),
                session.getSessionId(),GroupRoleEnum.OWNER.getRole());
        groupContactDao.save(groupContact);
    }


    @Override
    @Transactional
    @RedissonLocking(key = "#req.groupId")
    public void inviteFriend(InviteFriendReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());

        if (group.getMemberCount() + req.getTargetList().size() > GroupConstant.DEFAULT_MAX_MEMBER_COUNT){
            throw new BusinessException(CommonErrorEnum.MEMBER_LIMIT);
        }

        List<Long> collectList = req.getTargetList().stream().distinct().collect(Collectors.toList());
        List<GroupContact> contactList = new ArrayList<>();
        collectList.forEach(targetId -> contactList.add(GroupContactAdapter.buildDefaultContact(
                targetId, group.getId(), group.getSessionId(), GroupRoleEnum.MEMBER.getRole()))
        );

        groupInfoDao.updateById(group);
        groupContactDao.saveBatch(contactList);
    }

    @Override
    @RedissonLocking(key = "#req.fromId")
    public void applySend(GroupApplyReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());

        AssertUtil.isNotEmpty(group, "群聊参数提交错误");
        AssertUtil.isEmpty(contactApplyDao.getApplyByBothId(req.getFromId(), req.getGroupId()), "你已经提交过申请了");

        ContactApply apply = ContactApplyAdapter.buildGroupApply(req.getFromId(), req);
        contactApplyDao.save(apply);
    }
}
