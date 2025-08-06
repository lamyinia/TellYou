package org.com.modules.session.dao;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.mapper.GroupContactMapper;
import org.springframework.stereotype.Service;

@Service
public class GroupContactDao extends ServiceImpl<GroupContactMapper,GroupContact> {

    public boolean validatePower(Long userId, Long groupId, Integer level){
        GroupContact contact = lambdaQuery()
                .eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId)
                .ge(GroupContact::getRole, level).one();
        return ObjectUtil.isNotNull(contact);
    }

}
