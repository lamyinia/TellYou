package org.com.modules.group.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.dao.mysql.SessionDao;
import org.com.modules.contact.dao.mysql.ApplyDao;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.modules.contact.domain.enums.ConfirmEnum;
import org.com.modules.group.dao.mysql.GroupInfoDao;
import org.com.modules.contact.dao.mongodb.SessionDocDao;
import org.com.modules.group.domain.entity.GroupInfo;
import org.com.modules.group.domain.enums.GroupRoleEnum;
import org.com.modules.group.domain.vo.req.*;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfo;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfoList;
import org.com.modules.group.service.GroupInfoService;
import org.com.tools.constant.ValueConstant;
import org.com.tools.utils.AssertUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 群组管理的服务
 * @author lanye
 * @date 2025/07/30
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GroupInfoServiceImpl implements GroupInfoService {
    private final GroupContactDao groupContactDao;
    private final GroupInfoDao groupInfoDao;
    private final ApplyDao applyDao;
    private final SessionDao sessionDao;
    private final SessionDocDao mongoSessionDocDao;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @GlobalTransactional(rollbackFor = Exception.class)
    public void dissolveGroup(DissolveGroupReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        group.setIsDeleted(YesOrNoEnum.YES.getStatus());

        groupInfoDao.updateById(group);
        sessionDao.abandon(group.getSessionId());
        mongoSessionDocDao.abandon(group.getSessionId());
    }

    @Override
    @RedissonLocking(key = "#req.groupId")
    @Transactional(rollbackFor = Exception.class)
    public void transferOwner(TransferOwnerReq req) {
        GroupInfo group = groupInfoDao.getById(req.getGroupId());
        AssertUtil.isNotEmpty(group, "群聊已经不存在");

        GroupContact fromContact = groupContactDao.getByBothId(req.getFromUserId(), req.getGroupId());
        AssertUtil.isNotEmpty(fromContact, "你不是该群的成员");
        AssertUtil.isTrue(fromContact.getRole() >= GroupRoleEnum.MEMBER.getRole(), "你已经不是该群的成员了");
        AssertUtil.isTrue(fromContact.getRole().equals(GroupRoleEnum.OWNER.getRole()), "你不是群主");

        GroupContact targetContact = groupContactDao.getByBothId(req.getTargetId(), req.getGroupId());
        AssertUtil.isNotEmpty(targetContact, "目标用户不是该群的成员");
        AssertUtil.isTrue(targetContact.getRole() >= GroupRoleEnum.MEMBER.getRole(), "目标用户已经不是该群的成员了");

        fromContact.setRole(GroupRoleEnum.MEMBER.getRole());
        fromContact.setContactVersion(fromContact.getContactVersion() + 1);
        targetContact.setRole(GroupRoleEnum.OWNER.getRole());
        targetContact.setContactVersion(targetContact.getContactVersion() + 1);
        groupContactDao.updateBatchById(List.of(fromContact, targetContact));

        group.setGroupOwnerId(req.getTargetId());
        group.setUpdateTime(ValueConstant.getDefaultDate());
        groupInfoDao.updateById(group);

        // 还需要补充推送系统消息、推送权限变更的逻辑
    }

    @Override
    public void modifyName(ModifyNameReq req) {
        groupInfoDao.modifyName(req.getGroupId(), req.getName());
    }

    @Override
    public void modifyNotification(ModifyNotificationReq req) {
        groupInfoDao.modifyNotification(req.getGroupId(), req.getNotification());
    }

    @Override
    public void modifyCard(ModifyCardReq req) {
        groupInfoDao.modifyCard(req.getGroupId(), req.getCard());
    }

    @Override
    public void banChat(BanChatReq req) {
        groupInfoDao.metaChatMode(req.getGroupId(), req.getChatMode());
    }

    @Override
    public SimpleGroupInfoList getBaseInfoList(List<Long> groupIds) {
        List<SimpleGroupInfo> resp = groupInfoDao.getBaseInfoList(groupIds);
        return new SimpleGroupInfoList(resp);
    }

    @Override
    public List<Long> getMemberInfoList(MemberInfoListReq req) {
        return groupContactDao.getMemberInfoList(req);
    }

    @Override
    public List<ContactApply> getGroupApply(GroupApplyListReq req) {
        return applyDao.getGroupApplyPage(req, ConfirmEnum.WAITING.getStatus());
    }
}
