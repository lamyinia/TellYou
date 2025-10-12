package org.com.modules.session.dao;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.domain.vo.resp.ContactResp;
import org.com.modules.session.mapper.GroupContactMapper;
import org.com.modules.user.domain.enums.SessionTypeEnum;
import org.com.tools.constant.ValueConstant;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupContactDao extends ServiceImpl<GroupContactMapper,GroupContact> {

    public boolean validatePower(Long userId, Long groupId, Integer level){
        GroupContact contact = lambdaQuery()
                .eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId)
                .ge(GroupContact::getRole, level).one();
        return ObjectUtil.isNotNull(contact);
    }

    public GroupContact getByBothId(Long userId, Long groupId){
        return lambdaQuery().eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId).one();
    }

    public void leaveGroup(){

    }

    public void assignPower(Long userId, Long groupId, Integer role){
        lambdaUpdate().eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId)
                .set(GroupContact::getLastActive, ValueConstant.getDefaultDate())
                .set(GroupContact::getRole, role).update();
    }

    public List<ContactResp> selectGroupContactById(Long userId){
        List<GroupContact> list = lambdaQuery()
                .eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .select(GroupContact::getGroupId, GroupContact::getSessionId, GroupContact::getRole)
                .list();

        return list.stream().map(contact -> {
            return ContactResp.builder()
                    .sessionId(contact.getSessionId())
                    .contactId(contact.getGroupId())
                    .role(contact.getRole())
                    .contactType(SessionTypeEnum.PUBLIC.getStatus())
                    .build();
        }).toList();
    }
}
