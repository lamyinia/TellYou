package org.com.modules.group.dao.mysql;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import org.com.modules.common.domain.vo.req.PageReq;
import org.com.modules.group.domain.entity.GroupInfo;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfo;
import org.com.modules.group.mapper.GroupInfoMapper;
import org.com.tools.constant.ValueConstant;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupInfoDao extends ServiceImpl<GroupInfoMapper, GroupInfo> {

    public void assignOwner(Long groupId, Long backpackOwnerId){
        lambdaUpdate().eq(GroupInfo::getId, groupId)
                .set(GroupInfo::getBackpackOwnerId, backpackOwnerId)
                .set(GroupInfo::getUpdateTime, ValueConstant.getDefaultDate())
                .update();
    }

    public void modifyName(Long groupId, String name){
        lambdaUpdate().eq(GroupInfo::getId, groupId)
                .set(GroupInfo::getName, name)
                .set(GroupInfo::getUpdateTime, ValueConstant.getDefaultDate())
                .update();
    }

    public void modifyNotification(Long groupId, String notification){
        lambdaUpdate().eq(GroupInfo::getId, groupId)
                .set(GroupInfo::getNotification, notification)
                .set(GroupInfo::getUpdateTime, ValueConstant.getDefaultDate())
                .update();
    }

    public void modifyCard(Long groupId, String card){
        lambdaUpdate().eq(GroupInfo::getId, groupId)
                .set(GroupInfo::getCard, card)
                .set(GroupInfo::getUpdateTime, ValueConstant.getDefaultDate())
                .update();
    }

    public void metaChatMode(Long groupId, Integer mode){
        lambdaUpdate().eq(GroupInfo::getId, groupId)
                .set(GroupInfo::getMsgMode, mode)
                .set(GroupInfo::getUpdateTime, ValueConstant.getDefaultDate())
                .update();
    }

    public List<SimpleGroupInfo> getBaseInfoList(List<Long> groupIds) {
        List<GroupInfo> list = lambdaQuery()
                .in(GroupInfo::getId, groupIds)
                .select(GroupInfo::getId, GroupInfo::getName, GroupInfo::getAvatar)
                .list();
        return list.stream().map(info -> SimpleGroupInfo.builder()
                .groupId(info.getId())
                .groupName(info.getName())
                .avatar(info.getAvatar())
                .build()).toList();
    }

}
