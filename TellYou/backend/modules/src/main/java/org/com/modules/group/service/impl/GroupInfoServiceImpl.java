package org.com.modules.group.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.RedissonLocking;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.dao.mysql.SessionDao;
import org.com.modules.contact.dao.mysql.GroupContactDao;
import org.com.modules.group.dao.mysql.GroupInfoDao;
import org.com.modules.contact.dao.mongodb.SessionDocDao;
import org.com.modules.group.domain.entity.GroupInfo;
import org.com.modules.group.domain.enums.GroupRoleEnum;
import org.com.modules.group.domain.vo.req.*;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfo;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfoList;
import org.com.modules.group.service.GroupInfoService;
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
    private final SessionDao sessionDao;
    private final SessionDocDao mongoSessionDocDao;

    @Override
    public void assignOwner(AssignOwnerReq req) {
        groupInfoDao.assignOwner(req.getGroupId(), req.getMemberId());
    }

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
        AssertUtil.isFalse(groupContactDao.validatePower(req.getMemberId(), req.getGroupId(), GroupRoleEnum.MEMBER.getRole()), "目标退群了");

        groupContactDao.assignPower(req.getFromId(), req.getGroupId(), GroupRoleEnum.MEMBER.getRole());
        groupContactDao.assignPower(req.getMemberId(), req.getGroupId(), GroupRoleEnum.OWNER.getRole());
        groupInfoDao.assignOwner(req.getGroupId(),req.getMemberId());
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
}
