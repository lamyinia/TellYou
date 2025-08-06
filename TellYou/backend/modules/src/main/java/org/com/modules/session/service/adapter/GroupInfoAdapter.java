package org.com.modules.session.service.adapter;

import org.com.modules.common.domain.enums.InitMessageEnum;
import org.com.modules.session.domain.entity.GroupInfo;
import org.com.modules.session.domain.enums.GroupJoinModeEnum;
import org.com.tools.constant.GroupConstant;
import org.com.tools.constant.ValueConstant;

import java.util.Date;

public class GroupInfoAdapter {
    public static GroupInfo buildDefaultGroup(Long ownerId, Long sessionId, String groupName){
        return GroupInfo.builder().groupOwnerId(ownerId).sessionId(sessionId).name(groupName)
                .createTime(ValueConstant.getDefaultDate()).updateTime(ValueConstant.getDefaultDate())
                .card(InitMessageEnum.GROUP_CARD.getMessage()).avatar(GroupConstant.avatar)
                .notification(InitMessageEnum.GROUP_NOTIFICATION.getMessage())
                .maxMembers(GroupConstant.DEFAULT_MAX_MEMBER_COUNT).memberCount(GroupConstant.DEFAULT_MEMBER_COUNT)
                .joinMode(GroupJoinModeEnum.REVIEW_NEEDED.getStatus()).build();
    }
}
