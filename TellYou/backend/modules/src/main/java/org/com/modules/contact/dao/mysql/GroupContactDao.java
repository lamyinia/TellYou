package org.com.modules.contact.dao.mysql;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.modules.group.domain.vo.req.MemberInfoListReq;
import org.com.modules.group.domain.vo.resp.ContactResp;
import org.com.modules.contact.mapper.GroupContactMapper;
import org.com.modules.contact.domain.enums.SessionTypeEnum;
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

    public List<ContactResp> selectGroupContactByUserId(Long userId){
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

    public List<Long> selectMemberListById(Long groupId){
        List<GroupContact> list = lambdaQuery()
                .eq(GroupContact::getGroupId, groupId)
                .select(GroupContact::getUserId)
                .list();

        return list.stream().map(GroupContact::getUserId).toList();
    }

    @SuppressWarnings("unchecked")
    public List<Long> getMemberInfoList(MemberInfoListReq req){
        List<GroupContact> list = lambdaQuery()
                .eq(GroupContact::getGroupId, req.getGroupId())
                .select(GroupContact::getUserId)
                .eq(GroupContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .orderByDesc(GroupContact::getRole)
                .orderByAsc(GroupContact::getLastActive)
                .page(req.getPageReq().daoPage())
                .getRecords();

        return list.stream().map(GroupContact::getUserId).toList();
    }

    public List<GroupContact> selectGroupContactByUserIdList(Long groupId, List<Long> userIdList){
        return lambdaQuery()
                .eq(GroupContact::getGroupId, groupId)
                .in(GroupContact::getUserId, userIdList)
                .list();
    }
}
