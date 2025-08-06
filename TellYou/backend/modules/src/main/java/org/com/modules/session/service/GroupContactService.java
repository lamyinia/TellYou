package org.com.modules.session.service;

import org.com.modules.session.domain.vo.req.CreateGroupReq;
import org.com.modules.session.domain.vo.req.GroupApplyReq;
import org.com.modules.session.domain.vo.req.InviteFriendReq;

public interface GroupContactService {
    void createGroup(CreateGroupReq req);

    void inviteFriend(InviteFriendReq req);

    void applySend(GroupApplyReq req);
}
