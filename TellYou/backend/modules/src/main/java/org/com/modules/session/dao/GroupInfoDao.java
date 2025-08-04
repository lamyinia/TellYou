package org.com.modules.session.dao;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.session.domain.entity.GroupInfo;
import org.com.modules.session.mapper.GroupInfoMapper;
import org.springframework.stereotype.Service;

@Service
public class GroupInfoDao extends ServiceImpl<GroupInfoMapper, GroupInfo> {
}
