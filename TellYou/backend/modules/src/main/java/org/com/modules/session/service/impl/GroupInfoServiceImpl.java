package org.com.modules.session.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.session.dao.GroupContactDao;
import org.com.modules.session.dao.GroupInfoDao;
import org.com.modules.session.dao.MongoSessionDao;
import org.com.modules.session.dao.SessionDao;
import org.com.modules.session.domain.vo.req.AssignOwnerReq;
import org.com.modules.session.service.GroupInfoService;
import org.springframework.stereotype.Service;

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
    private final MongoSessionDao mongoSessionDao;

    @Override
    public void assignOwner(AssignOwnerReq req) {
        groupInfoDao.assignOwner(req.getGroupId(), req.getMemberId());
    }
}
