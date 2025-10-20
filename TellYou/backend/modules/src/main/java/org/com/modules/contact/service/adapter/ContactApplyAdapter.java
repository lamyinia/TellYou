package org.com.modules.contact.service.adapter;

import org.com.modules.group.domain.vo.req.GroupApplyReq;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.enums.ConfirmEnum;
import org.com.modules.contact.domain.enums.ContactTypeEnum;
import org.com.modules.contact.domain.vo.req.FriendApplyReq;
import org.com.tools.constant.ValueConstant;

public class ContactApplyAdapter {
    public static ContactApply buildFriendApply(Long uid, FriendApplyReq friendApplyReq){
        return ContactApply.builder().applyUserId(uid)
                .targetId(friendApplyReq.getContactId())
                .applyInfo(friendApplyReq.getDescription())
                .contactType(ContactTypeEnum.FRIEND.getStatus())
                .lastApplyTime(ValueConstant.getDefaultDate())
                .status(ConfirmEnum.WAITING.getStatus())
                .build();
    }

    public static ContactApply buildGroupApply(Long uid, GroupApplyReq groupApplyReq){
        return ContactApply.builder().applyUserId(uid)
                .targetId(groupApplyReq.getGroupId())
                .applyInfo(groupApplyReq.getDescription())
                .contactType(ContactTypeEnum.GROUP.getStatus())
                .lastApplyTime(ValueConstant.getDefaultDate())
                .status(ConfirmEnum.WAITING.getStatus())
                .build();
    }
}
