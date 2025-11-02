package org.com.modules.contact.service.adapter;

import org.com.modules.common.domain.enums.YesOrNoEnum;
import org.com.modules.contact.domain.entity.GroupContact;
import org.com.tools.constant.ValueConstant;

public class GroupContactAdapter {
    public static GroupContact buildDefaultContact(Long userId, Long groupId, Long sessionId, Integer role){
        return GroupContact.builder()
                .userId(userId)
                .groupId(groupId)
                .sessionId(sessionId)
                .role(role)
                .contactVersion(ValueConstant.DEFAULT_VALUE)
                .joinTime(ValueConstant.getDefaultDate())
                .lastActive(ValueConstant.getDefaultDate())
                .isDeleted(YesOrNoEnum.NO.getStatus())
                .build();
    }
}
