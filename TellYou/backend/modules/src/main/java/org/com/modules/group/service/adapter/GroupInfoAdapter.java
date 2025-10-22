package org.com.modules.group.service.adapter;

import org.com.modules.group.domain.enums.GroupCreatedEnum;
import org.com.modules.group.domain.entity.GroupInfo;
import org.com.modules.group.domain.enums.GroupJoinModeEnum;
import org.com.tools.constant.GroupConstant;
import org.com.tools.constant.ValueConstant;

public class GroupInfoAdapter {
    public static GroupInfo buildDefaultGroup(Long ownerId, Long sessionId, String groupName){
        return GroupInfo.builder()
                .groupOwnerId(ownerId)
                .sessionId(sessionId)
                .name(groupName)
                .createTime(ValueConstant.getDefaultDate())
                .updateTime(ValueConstant.getDefaultDate())
                .card(GroupCreatedEnum.GROUP_CARD.getMessage())
                .avatar("toBeFilled")
                .notification(GroupCreatedEnum.GROUP_NOTIFICATION.getMessage())
                .maxMembers(GroupConstant.DEFAULT_MAX_MEMBER_COUNT).memberCount(GroupConstant.DEFAULT_MEMBER_COUNT)
                .joinMode(GroupJoinModeEnum.REVIEW_NEEDED.getStatus())
                .build();
    }
}
