package org.com.modules.contact.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.util.SnowFlakeUtil;
import org.com.modules.contact.dao.mongodb.SessionDocDao;
import org.com.modules.contact.dao.mysql.ApplyDao;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.modules.contact.domain.entity.Session;
import org.com.modules.contact.domain.enums.ConfirmEnum;
import org.com.modules.contact.domain.enums.SessionEventEnum;
import org.com.modules.contact.service.GroupContactService;
import org.com.modules.contact.service.adapter.ContactApplyAdapter;
import org.com.modules.contact.service.adapter.GroupContactAdapter;
import org.com.modules.contact.service.adapter.SessionAdapter;
import org.com.modules.deliver.domain.vo.push.PushedSession;
import org.com.modules.deliver.event.AggregateEvent;
import org.com.modules.deliver.event.ApplyEvent;
import org.com.modules.deliver.event.SessionEvent;
import org.com.modules.group.dao.mysql.GroupInfoDao;
import org.com.modules.group.domain.entity.GroupInfo;
import org.com.modules.group.domain.enums.GroupRoleEnum;
import org.com.modules.group.domain.vo.req.*;
import org.com.modules.group.service.adapter.GroupInfoAdapter;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.modules.mail.domain.enums.MessageTypeEnum;
import org.com.tools.constant.GroupConstant;
import org.com.tools.constant.ValueConstant;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
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
public class GroupContactServiceImpl implements GroupContactService {
    private final GroupContactDao groupContactDao;
    private final GroupInfoDao groupInfoDao;
    private final ApplyDao applyDao;
    private final SnowFlakeUtil snowFlakeUtil;
    private final SessionDocDao mongoSessionDocDao;
    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void createGroup(CreateGroupReq req) {
        Session session = SessionAdapter.buildDefaultGroupSession(snowFlakeUtil.nextId());
        mongoSessionDocDao.save(session);

        GroupInfo groupInfo = GroupInfoAdapter.buildDefaultGroup(req.getFromUserId(), session.getSessionId(), req.getName());
        groupInfoDao.save(groupInfo);

        GroupContact groupContact = GroupContactAdapter.buildDefaultContact(req.getFromUserId(), groupInfo.getId(),
                session.getSessionId(),GroupRoleEnum.OWNER.getRole());
        groupContactDao.save(groupContact);

        PushedSession push = new PushedSession(groupInfo.getSessionId(), groupInfo.getId(), req.getFromUserId(),
                SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());

        applicationEventPublisher.publishEvent(new SessionEvent(this, push, List.of(req.getFromUserId())));
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
        collectList.forEach(targetId -> contactList
                .add(GroupContactAdapter
                        .buildDefaultContact(targetId, group.getId(), group.getSessionId(), GroupRoleEnum.MEMBER.getRole()))
        );

        group.setMemberCount(group.getMemberCount() + contactList.size());
        group.setUpdateTime(ValueConstant.getDefaultDate());

        groupInfoDao.updateById(group);
        groupContactDao.saveBatch(contactList);

        PushedSession push = new PushedSession(group.getSessionId(), group.getId(), null,
                SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());
        // 发布聚合事件
        AggregateDTO aggregateDTO = new AggregateDTO(req.getTargetList(), group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_ENTER_NOTIFY.getType());

        applicationEventPublisher.publishEvent(new SessionEvent(this, push, req.getTargetList()));
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));
    }

    @Override
    @RedissonLocking(key = "#req.fromUserId")
    public void applySend(GroupApplyReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());

        AssertUtil.isNotEmpty(group, "群聊不存在");
        AssertUtil.isFalse(groupContactDao.validatePower(req.getFromUserId(), req.getGroupId(), GroupRoleEnum.MEMBER.getRole()), "你已经是该群的成员了");
        AssertUtil.isEmpty(applyDao.getGroupApply(req.getFromUserId(), req.getGroupId()), "你已经提交过申请了");

        ContactApply apply = ContactApplyAdapter.buildGroupApply(req.getFromUserId(), req);
        applyDao.save(apply);

        applicationEventPublisher.publishEvent(new ApplyEvent(this, apply, List.of(req.getFromUserId())));
    }

    @Override
    @Transactional
    @RedissonLocking(key = "#req.groupId")  // 群聊人数自增
    public void acceptMember(GroupApplyAcceptReq req) {
        ContactApply apply = applyDao.getById(req.getApplyId());
        AssertUtil.isNotEmpty(apply, "申请表不存在");
        AssertUtil.isTrue(apply.getStatus() == ConfirmEnum.WAITING.getStatus(), "该申请已被同意");
        AssertUtil.isTrue(req.getGroupId() == apply.getTargetId(), "对方申请参数非法");

        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊不存在");
        AssertUtil.isFalse(group.getMemberCount() >= GroupConstant.DEFAULT_MAX_MEMBER_COUNT, "群聊已经满了");

        group.setUpdateTime(ValueConstant.getDefaultDate());
        group.setMemberCount(group.getMemberCount() + 1);
        apply.setStatus(ConfirmEnum.ACCEPTED.getStatus());
        apply.setAcceptorId(req.getFromUserId());

        GroupContact groupContact = GroupContactAdapter
                .buildDefaultContact(req.getFromUserId(), group.getId(), group.getSessionId(), GroupRoleEnum.MEMBER.getRole());

        applyDao.updateById(apply);
        groupInfoDao.updateById(group);
        groupContactDao.save(groupContact);

        PushedSession pushedSession = new PushedSession(group.getSessionId(), group.getId(),
                null, SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());
        // 发布聚合事件
        AggregateDTO aggregateDTO = new AggregateDTO(List.of(apply.getApplyUserId()), group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_ENTER_NOTIFY.getType());

        applicationEventPublisher.publishEvent(new SessionEvent(this, pushedSession, List.of(apply.getApplyUserId())));
        applicationEventPublisher.publishEvent(new ApplyEvent(this, apply, List.of(apply.getApplyUserId())));
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));
    }

    @Override
    @RedissonLocking(key = "#req.groupId")
    public void leaveGroup(LeaveGroupReq req) {
        boolean isOwner = groupContactDao.validatePower(req.getFromId(), req.getGroupId(), GroupRoleEnum.OWNER.getRole());

        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        if (group.getMemberCount().equals(GroupConstant.DEFAULT_MEMBER_COUNT)){
            throw new BusinessException(CommonErrorEnum.GROUP_API_ERROR);  // 群只有 1 个人，请求解散改群的接口
        }
        if (isOwner){
            if (group.getBackpackOwnerId() == null){
                throw new BusinessException(CommonErrorEnum.BACKPACK_OWNER_ERROR);
            }
            groupContactDao.assignPower(group.getBackpackOwnerId(), req.getGroupId(), GroupRoleEnum.OWNER.getRole());
            group.setGroupOwnerId(group.getBackpackOwnerId());
            group.setBackpackOwnerId(null);
        }
        if (group.getBackpackOwnerId() == req.getFromId()){  // 备选群主退群
            group.setBackpackOwnerId(null);
        }
        group.setMemberCount(group.getMemberCount() - 1);
        group.setUpdateTime(ValueConstant.getDefaultDate());

        groupContactDao.assignPower(req.getFromId(), req.getGroupId(), GroupRoleEnum.NORMAL.getRole());
        groupInfoDao.updateById(group);
        
        // 发布退群聚合事件
        AggregateDTO leaveAggregateDTO = new AggregateDTO(List.of(req.getFromId()), group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_EXIT_NOTIFY.getType());
        
        applicationEventPublisher.publishEvent(new AggregateEvent(this, leaveAggregateDTO));
    }

    @Override
    public void addManager(AddManagerReq req) {

    }

    @Override
    public void withdrawManager(WithdrawManagerReq req) {

    }
}
