package org.com.modules.session.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.mapper.GroupContactMapper;
import org.springframework.stereotype.Service;

@Service
public class GroupContactDao extends ServiceImpl<GroupContactMapper,GroupContact> {
}
