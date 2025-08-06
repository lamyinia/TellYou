package org.com.modules.user.service.adapter;

import org.com.modules.session.domain.vo.req.GroupApplyReq;
import org.com.modules.user.domain.entity.ContactApply;
import org.com.modules.user.domain.enums.ConfirmEnum;
import org.com.modules.user.domain.enums.ContactTypeEnum;
import org.com.modules.user.domain.vo.req.FriendApplyReq;

public class ContactApplyAdapter {
    public static ContactApply buildFriendApply(Long uid, FriendApplyReq friendApplyReq){
        return ContactApply.builder().applyUserId(uid)
                .targetId(friendApplyReq.getContactId())
                .applyInfo(friendApplyReq.getDescription())
                .contactType(ContactTypeEnum.FRIEND.getStatus())
                .status(ConfirmEnum.WAITING.getStatus())
                .build();
    }

    public static ContactApply buildGroupApply(Long uid, GroupApplyReq groupApplyReq){
        return ContactApply.builder().applyUserId(uid)
                .targetId(groupApplyReq.getGroupId())
                .applyInfo(groupApplyReq.getDescription())
                .contactType(ContactTypeEnum.GROUP.getStatus())
                .status(ConfirmEnum.WAITING.getStatus())
                .build();
    }
}
