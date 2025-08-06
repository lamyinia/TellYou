package org.com.modules.session.service;

import org.com.modules.session.domain.vo.req.*;

public interface GroupContactService {
    void createGroup(CreateGroupReq req);

    void inviteFriend(InviteFriendReq req);

    void applySend(GroupApplyReq req);

    void leaveGroup(LeaveGroupReq req);

    void addManager(AddManagerReq req);

    void withdrawManager(WithdrawManagerReq req);
}
