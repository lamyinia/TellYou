package org.com.modules.contact.service;

import org.com.modules.group.domain.vo.req.*;

import java.util.List;


public interface GroupContactService {
    void createGroup(CreateGroupReq req);

    List<Long> inviteFriend(InviteFriendReq req);

    void applySend(GroupApplyReq req);

    void leaveGroup(LeaveGroupReq req);

    void addManager(AddManagerReq req);

    void withdrawManager(WithdrawManagerReq req);

    List<Long> acceptMember(GroupApplyAcceptReq req);

    void kickOut(KickMemberReq req);
}
