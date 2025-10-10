package org.com.modules.user.service;

import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.session.domain.vo.resp.PullFriendContactResp;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.user.domain.vo.resp.FriendContactResp;
import org.com.modules.user.domain.vo.resp.SimpleApplyInfoList;

public interface UserContactService {
    void friendApplySend(Long uid, FriendApplyReq friendApplyReq);

    void applyAccept(AcceptFriendApplyReq req);

    void pullBlackList(PullBlackListReq req);

    void removeBlackList(RemoveBlackListReq req);

    void deleContact(DeleteContactReq req);

    CursorPageResp<FriendContactResp> friendListPage(CursorPageReq req);

    PullFriendContactResp pullFriendContact(Long uid);

    SimpleApplyInfoList pullApplyInfoList(Long uid);
}
