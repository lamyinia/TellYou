package org.com.modules.session.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.session.domain.entity.Session;
import org.com.modules.session.mapper.SessionMapper;
import org.springframework.stereotype.Service;

@Service
public class SessionDao extends ServiceImpl<SessionMapper, Session> {

}
