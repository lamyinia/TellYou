package org.com.modules.contact.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.common.util.SnowFlakeUtil;
import java.util.*;
import java.util.stream.Collectors;
import org.com.modules.common.util.UrlUtil;
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
import org.com.modules.mail.cache.CacheMissProducer;
import org.com.modules.mail.domain.dto.AggregateDTO;
import org.com.modules.mail.domain.enums.MessageTypeEnum;
import org.com.modules.media.service.minio.UploadFileService;
import org.com.tools.constant.GroupConstant;
import org.com.tools.constant.ValueConstant;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.AssertUtil;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 因为自己既想用 mongodb，又想用 mysql，导致 mongodb 的事务由 spring 管理，mysql 的事务由 seata 管理
 * 就不是分布式事务了，没有原子性。
 * 除非再用 seata 的 TCC 模式。
 * 但现在的代码已经能够保证高可用了。
 * @author lanye
 * @since 2025/10/27 22:16
 * @see org.springframework.transaction.annotation.Transactional
 * @see io.seata.spring.annotation.GlobalTransactional
 */


@Slf4j
@Service
@RequiredArgsConstructor
public class GroupContactServiceImpl implements GroupContactService {
    private final GroupContactDao groupContactDao;
    private final GroupInfoDao groupInfoDao;
    private final ApplyDao applyDao;
    private final SnowFlakeUtil snowFlakeUtil;
    private final SessionDocDao mongoSessionDocDao;
    private final UploadFileService uploadFileService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final CacheMissProducer cacheMissProducer;
    private final MinioTemplate minioTemplate;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void createGroup(CreateGroupReq req) {
        Session session = SessionAdapter.buildDefaultGroupSession(snowFlakeUtil.nextId());
        mongoSessionDocDao.save(session);

        GroupInfo groupInfo = GroupInfoAdapter.buildDefaultGroup(req.getFromUserId(), session.getSessionId(), req.getName());
        groupInfoDao.save(groupInfo);
        String avatarObjectName = UrlUtil.generateGroupAvatar(groupInfo.getId());
        uploadFileService.writeDefaultGroupAvatar(minioTemplate.getHost() + avatarObjectName);  // 上传默认头像

        groupInfo.setAvatar(avatarObjectName);
        groupInfoDao.updateById(groupInfo);  // 回写群头像 url

        GroupContact groupContact = GroupContactAdapter.buildDefaultContact(req.getFromUserId(), groupInfo.getId(),
                session.getSessionId(), GroupRoleEnum.OWNER.getRole());
        groupContactDao.save(groupContact);

        PushedSession push = new PushedSession(groupInfo.getSessionId(), groupInfo.getId(), req.getFromUserId(),
                SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());

        // 推送建群通知
        applicationEventPublisher.publishEvent(new SessionEvent(this, push, List.of(req.getFromUserId())));
    }


    @Override
    @Transactional
    @RedissonLocking(key = "#req.groupId")
    public List<Long> inviteFriend(InviteFriendReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        if (group.getMemberCount() + req.getTargetList().size() > GroupConstant.DEFAULT_MAX_MEMBER_COUNT){
            throw new BusinessException(CommonErrorEnum.MEMBER_LIMIT);
        }

        List<Long> collectList = req.getTargetList().stream().distinct().collect(Collectors.toList());

        List<GroupContact> existingContactList = groupContactDao.selectGroupContactByUserIdList(req.getGroupId(), collectList);
        Map<Long, GroupContact> existingContactMap = existingContactList.stream()
                .collect(Collectors.toMap(GroupContact::getUserId, contact -> contact));
        List<GroupContact> insertContactList = new ArrayList<>();
        List<GroupContact> updateContactList = new ArrayList<>();

        collectList.forEach(targetId -> {
            GroupContact existingContact = existingContactMap.get(targetId);
            if (existingContact != null && existingContact.getIsDeleted().equals(YesOrNoEnum.YES.getStatus())) {
                existingContact.setIsDeleted(YesOrNoEnum.NO.getStatus());
                existingContact.setContactVersion(existingContact.getContactVersion() + 1);
                existingContact.setJoinTime(new Date());
                existingContact.setRole(GroupRoleEnum.MEMBER.getRole());
                updateContactList.add(existingContact);
            } else if (existingContact == null){
                GroupContact groupContact = GroupContactAdapter
                        .buildDefaultContact(targetId, group.getId(), group.getSessionId(), GroupRoleEnum.MEMBER.getRole());
                insertContactList.add(groupContact);
            }
        });

        group.setMemberCount(group.getMemberCount() + insertContactList.size() + updateContactList.size());
        group.setUpdateTime(ValueConstant.getDefaultDate());

        groupInfoDao.updateById(group);
        groupContactDao.saveBatch(insertContactList);
        groupContactDao.updateBatchById(updateContactList);

        insertContactList.addAll(updateContactList);
        List<Long> newMembers = insertContactList.stream().map(GroupContact::getUserId).collect(Collectors.toList());

        cacheMissProducer.addNewMembers(group.getId(), newMembers);

        PushedSession push = new PushedSession(group.getSessionId(), group.getId(), null,
                SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());
        // 发布聚合事件
        AggregateDTO aggregateDTO = new AggregateDTO(newMembers, group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_ENTER_NOTIFY.getType());

        applicationEventPublisher.publishEvent(new SessionEvent(this, push, newMembers));
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));

        return newMembers;
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
    @RedissonLocking(key = "#req.groupId")  // 分布式锁控制群聊人数增加
    public List<Long> acceptMember(GroupApplyAcceptReq req) {
        List<ContactApply> applyList = applyDao.selectApplyByIds(req.getApplyIds());  // 过滤掉已经处理过的申请请求

        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        applyList.forEach(apply -> {
            apply.setStatus(ConfirmEnum.ACCEPTED.getStatus());
            apply.setAcceptorId(req.getFromUserId());
            AssertUtil.isTrue(req.getGroupId().equals(apply.getTargetId()), "参数错误，存在异常的申请");
        });
        AssertUtil.isFalse(group.getMemberCount() + applyList.size() > GroupConstant.DEFAULT_MAX_MEMBER_COUNT, "群聊已经满了");

        group.setMemberCount(group.getMemberCount() + applyList.size());
        List <Long> newMembers = applyList.stream().map(ContactApply::getApplyUserId).toList();

        // 群关系版本化管理，可能有之前退群的用户
        List<GroupContact> existingContactList = groupContactDao.selectGroupContactByUserIdList(req.getGroupId(), newMembers);

        // 创建已存在用户的映射，便于快速查找
        Map<Long, GroupContact> existingContactMap = existingContactList.stream()
                .collect(Collectors.toMap(GroupContact::getUserId, contact -> contact));

        // 分别处理退群用户和新用户
        List<GroupContact> insertContactList = new ArrayList<>();
        List<GroupContact> updateContactList = new ArrayList<>();

        applyList.forEach(apply -> {
            Long userId = apply.getApplyUserId();
            GroupContact existingContact = existingContactMap.get(userId);

            if (existingContact != null) {
                AssertUtil.isTrue(existingContact.getIsDeleted() == YesOrNoEnum.YES.getStatus(), "用户已在群中，存在异常的申请");
                existingContact.setIsDeleted(YesOrNoEnum.NO.getStatus());
                existingContact.setContactVersion(existingContact.getContactVersion() + 1);
                existingContact.setJoinTime(new Date());
                existingContact.setRole(GroupRoleEnum.MEMBER.getRole());
                updateContactList.add(existingContact);
            } else {
                GroupContact groupContact = GroupContactAdapter
                        .buildDefaultContact(userId, group.getId(), group.getSessionId(), GroupRoleEnum.MEMBER.getRole());
                insertContactList.add(groupContact);
            }
        });

        applyDao.updateBatchById(applyList);
        groupInfoDao.updateById(group);
        if (!insertContactList.isEmpty()) {
            groupContactDao.saveBatch(insertContactList);
        }
        if (!updateContactList.isEmpty()) {
            groupContactDao.updateBatchById(updateContactList);
        }

        PushedSession pushedSession = new PushedSession(group.getSessionId(), group.getId(), null, SessionEventEnum.BUILD_PUBLIC.getStatus(), System.currentTimeMillis());
        AggregateDTO aggregateDTO = new AggregateDTO(newMembers, group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_ENTER_NOTIFY.getType());

        // 通知缓存失效
        cacheMissProducer.addNewMembers(group.getId(), newMembers);

        // 推送消息
        applicationEventPublisher.publishEvent(new SessionEvent(this, pushedSession, newMembers));  // 聊天室推送可以聚合
        applyList.forEach(apply -> {
            applicationEventPublisher.publishEvent(new ApplyEvent(this, apply, List.of(apply.getApplyUserId())));  // 申请通过不能聚合
        });
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));  // 入群消息可以聚合

        return newMembers;
    }

    @Override
    @RedissonLocking(key = "#req.groupId")
    public void leaveGroup(LeaveGroupReq req) {
        GroupContact contact = groupContactDao.getByBothId(req.getFromUserId(), req.getGroupId());
        AssertUtil.isNotEmpty(contact, "你不是该群的成员");
        AssertUtil.isTrue(contact.getRole() >= GroupRoleEnum.MEMBER.getRole(), "你已经不是该群的成员了");

        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        if (group.getMemberCount().equals(GroupConstant.DEFAULT_MEMBER_COUNT)){
            // 群只有 1 个人，需要请求解散改群的接口
            throw new BusinessException(CommonErrorEnum.GROUP_API_ERROR);
        }
        if (contact.getRole().equals(GroupRoleEnum.OWNER)){
            //  群主退群前，要求指定群主
            throw new BusinessException(CommonErrorEnum.BACKPACK_OWNER_ERROR);
        }
        group.setMemberCount(group.getMemberCount() - 1);
        group.setUpdateTime(ValueConstant.getDefaultDate());

        contact.setRole(GroupRoleEnum.MEMBER.getRole());
        contact.setIsDeleted(YesOrNoEnum.YES.getStatus());

        groupContactDao.updateById(contact);
        groupInfoDao.updateById(group);

        cacheMissProducer.removeMembers(group.getId(), List.of(req.getFromUserId()));

        PushedSession pushedSession = new PushedSession(group.getSessionId(), group.getId(), req.getFromUserId(), SessionEventEnum.DELETE_PUBLIC.getStatus(), System.currentTimeMillis());
        applicationEventPublisher.publishEvent(new SessionEvent(this, pushedSession, List.of(req.getFromUserId())));

        AggregateDTO aggregateDTO = new AggregateDTO(List.of(req.getFromUserId()), group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_EXIT_NOTIFY.getType());
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));
    }

    @Override
    @RedissonLocking(key = "#req.groupId")
    public void kickOut(KickMemberReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        GroupContact contact = groupContactDao.getByBothId(req.getFromUserId(), req.getGroupId());
        AssertUtil.isNotEmpty(contact, "你不是该群的成员");
        AssertUtil.isTrue(contact.getRole() >= GroupRoleEnum.MEMBER.getRole(), "你已经不是该群的成员了");

        GroupContact targetContact = groupContactDao.getByBothId(req.getTargetId(), req.getGroupId());
        AssertUtil.isNotEmpty(targetContact, "目标用户不是该群的成员");
        AssertUtil.isTrue(targetContact.getRole() >= GroupRoleEnum.MEMBER.getRole(), "目标用户已经不是该群的成员了");
        AssertUtil.isTrue(targetContact.getRole().equals(GroupRoleEnum.MEMBER.getRole()), "没有权限踢出该用户，请对该用户降级");

        if (group.getMemberCount().equals(GroupConstant.DEFAULT_MEMBER_COUNT)){
            // 群只有 1 个人，需要请求解散改群的接口
            throw new BusinessException(CommonErrorEnum.GROUP_API_ERROR);
        }
        targetContact.setRole(GroupRoleEnum.MEMBER.getRole());
        targetContact.setIsDeleted(YesOrNoEnum.YES.getStatus());
        groupContactDao.updateById(targetContact);

        group.setMemberCount(group.getMemberCount() - 1);
        group.setUpdateTime(ValueConstant.getDefaultDate());
        groupInfoDao.updateById(group);

        cacheMissProducer.removeMembers(group.getId(), List.of(req.getTargetId()));

        PushedSession pushedSession = new PushedSession(group.getSessionId(), group.getId(), req.getTargetId(), SessionEventEnum.DELETE_PUBLIC.getStatus(), System.currentTimeMillis());
        applicationEventPublisher.publishEvent(new SessionEvent(this, pushedSession, List.of(req.getTargetId())));

        AggregateDTO aggregateDTO = new AggregateDTO(List.of(req.getTargetId()), group.getId(), group.getSessionId(), MessageTypeEnum.SYSTEM_EXIT_NOTIFY.getType());
        applicationEventPublisher.publishEvent(new AggregateEvent(this, aggregateDTO));
    }

    @Override
    public void addManager(AddManagerReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        List<Long> collectList = req.getMemberList().stream().distinct().collect(Collectors.toList());
        List<GroupContact> ContactList = groupContactDao.selectGroupContactByUserIdList(req.getGroupId(), collectList);
        AssertUtil.isTrue(ContactList.size() == collectList.size(), "存在非法的群成员ID");

        ContactList.forEach(contact -> {
            AssertUtil.isTrue(contact.getRole() >= GroupRoleEnum.MEMBER.getRole() && contact.getIsDeleted().equals(YesOrNoEnum.NO.getStatus()), "存在非法的群成员ID");
            contact.setRole(GroupRoleEnum.MANAGER.getRole());
            contact.setContactVersion(contact.getContactVersion() + 1);
        });

        groupContactDao.updateBatchById(ContactList);

        // 还需要补充推送系统消息、推送权限变更的逻辑
    }

    @Override
    public void withdrawManager(WithdrawManagerReq req) {

    }
}
