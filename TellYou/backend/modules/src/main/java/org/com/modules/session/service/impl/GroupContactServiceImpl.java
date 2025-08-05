package org.com.modules.session.service.impl;

import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.dao.GroupContactDao;
import org.com.modules.session.dao.GroupInfoDao;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.session.dao.SessionDao;
import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.domain.entity.GroupInfo;
import org.com.modules.session.domain.entity.Session;
import org.com.modules.session.domain.enums.GroupRoleEnum;
import org.com.modules.session.domain.vo.req.CreateGroupReq;
import org.com.modules.session.service.GroupContactService;
import org.com.modules.session.service.adapter.GroupContactAdapter;
import org.com.modules.session.service.adapter.GroupInfoAdapter;
import org.com.modules.session.service.adapter.SessionAdapter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupContactServiceImpl implements GroupContactService {
    private final GroupContactDao groupContactDao;
    private final GroupInfoDao groupInfoDao;
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

}
