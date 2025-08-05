package org.com.modules.session.service.adapter;

import org.com.modules.session.domain.entity.GroupContact;
import org.com.modules.session.domain.enums.GroupRoleEnum;

import java.util.Date;

public class GroupContactAdapter {
    public static GroupContact buildDefaultContact(Long userId, Long groupId, Long sessionId, Integer role){
        return GroupContact.builder().userId(userId).groupId(groupId).sessionId(sessionId)
                .role(role)
                .joinTime(new Date()).lastActive(new Date())
                .build();
    }
}
