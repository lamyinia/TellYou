package org.com.modules.contact.service;

import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.vo.req.*;
import org.com.modules.contact.domain.vo.resp.PullFriendContactResp;
import org.com.modules.contact.domain.vo.resp.FriendContactResp;

public interface UserContactService {
    void friendApplySend(Long uid, FriendApplyReq friendApplyReq);

    void applyAccept(AcceptFriendApplyReq req);

    void pullBlackList(PullBlackListReq req);

    void removeBlackList(RemoveBlackListReq req);

    void deleContact(DeleteContactReq req);

    CursorPageResp<FriendContactResp> friendListPage(CursorPageReq req);

    PullFriendContactResp pullFriendContact(Long uid);

    CursorPageResp<ContactApply> pullIncoming(CursorPageReq req);

    CursorPageResp<ContactApply> pullOutPosting(CursorPageReq req);
}
