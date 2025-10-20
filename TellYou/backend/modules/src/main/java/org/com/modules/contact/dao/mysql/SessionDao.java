package org.com.modules.contact.dao.mysql;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.domain.entity.Session;
import org.com.modules.contact.mapper.SessionMapper;
import org.springframework.stereotype.Service;

@Service
public class SessionDao extends ServiceImpl<SessionMapper, Session> {
    public void updateStatus(Long sessionId, Integer status){
        lambdaUpdate().set(Session::getIsDeleted, status)
                .eq(Session::getSessionId, sessionId).update();
    }

    public void abandon(Long sessionId) {
        lambdaUpdate().eq(Session::getSessionId, sessionId)
                .set(Session::getIsDeleted, YesOrNoEnum.YES.getStatus())
                .update();
    }
}
