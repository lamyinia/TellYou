package org.com.modules.group.service;

import org.com.modules.common.domain.vo.resp.PageResp;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.group.domain.vo.req.*;
import org.com.modules.group.domain.vo.resp.GroupMemberInfoResp;
import org.com.modules.group.domain.vo.resp.InvitableFriendResp;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfoList;

import java.util.List;

public interface GroupInfoService {
    void dissolveGroup(DissolveGroupReq req);

    void transferOwner(TransferOwnerReq req);

    void modifyName(ModifyNameReq req);

    void modifyNotification(ModifyNotificationReq req);

    void modifyCard(ModifyCardReq req);

    void banChat(BanChatReq req);

    SimpleGroupInfoList getBaseInfoList(List<Long> groupIds);

    PageResp<GroupMemberInfoResp> getMemberInfoList(MemberInfoListReq req);

    List<ContactApply> getGroupApply(GroupApplyListReq req);

    PageResp<InvitableFriendResp> getInvitableFriendList(InvitableFriendListReq req);
}

