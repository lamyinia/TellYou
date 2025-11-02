package org.com.modules.contact.dao.mysql;

import cn.hutool.core.util.ObjectUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.modules.group.domain.vo.req.InvitableFriendListReq;
import org.com.modules.group.domain.vo.req.MemberInfoListReq;
import org.com.modules.group.domain.vo.resp.ContactResp;
import org.com.modules.group.domain.vo.resp.GroupMemberInfoResp;
import org.com.modules.group.domain.vo.resp.InvitableFriendResp;
import org.com.modules.common.domain.vo.resp.PageResp;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.com.modules.mail.cache.entity.GroupMemberInfo;
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
        return lambdaQuery()
                .eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId)
                .one();
    }

    public void assignPower(Long userId, Long groupId, Integer role){
        lambdaUpdate().eq(GroupContact::getUserId, userId)
                .eq(GroupContact::getGroupId, groupId)
                .set(GroupContact::getLastActive, ValueConstant.getDefaultDate())
                .set(GroupContact::getRole, role)
                .update();
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

    public List<GroupMemberInfo> selectMemberListById(Long groupId){
        List<GroupContact> list = lambdaQuery()
                .eq(GroupContact::getGroupId, groupId)
                .select(GroupContact::getUserId, GroupContact::getRole)
                .list();

        return list.stream().map(item -> new GroupMemberInfo(item.getUserId(), item.getRole())).toList();
    }

    @SuppressWarnings("unchecked")
    public PageResp<GroupMemberInfoResp> getMemberInfoList(MemberInfoListReq req){
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<GroupContact> page = lambdaQuery()
                .eq(GroupContact::getGroupId, req.getGroupId())
                .select(GroupContact::getUserId, GroupContact::getRole) // 同时查询userId和role
                .eq(GroupContact::getIsDeleted, YesOrNoEnum.NO.getStatus())
                .orderByDesc(GroupContact::getRole) // 先按角色排序（群主>管理员>成员）
                .orderByAsc(GroupContact::getJoinTime) // 再按入群时间排序
                .page(req.getPageReq().daoPage());

        List<GroupMemberInfoResp> list = page.getRecords().stream().map(contact -> 
            GroupMemberInfoResp.builder()
                .userId(contact.getUserId())
                .role(contact.getRole())
                .build()
        ).toList();

        // 返回分页信息
        return PageResp.init(page, list);
    }

    public List<GroupContact> selectGroupContactByUserIdList(Long groupId, List<Long> userIdList){
        return lambdaQuery()
                .in(GroupContact::getUserId, userIdList)
                .eq(GroupContact::getGroupId, groupId)
                .list();
    }

    @SuppressWarnings("unchecked")
    public PageResp<InvitableFriendResp> getInvitableFriendList(InvitableFriendListReq req){
        Page<InvitableFriendResp> page = req.getPageReq().daoPage();
        com.baomidou.mybatisplus.core.metadata.IPage<InvitableFriendResp> result = baseMapper.getInvitableFriendList(page, req);
        return PageResp.init(result);
    }
}
