package org.com.modules.user.service;

import org.com.modules.user.domain.vo.req.FriendApplyReq;

public interface UserContactService {
    void friendApplySend(Long uid, FriendApplyReq friendApplyReq);
}
