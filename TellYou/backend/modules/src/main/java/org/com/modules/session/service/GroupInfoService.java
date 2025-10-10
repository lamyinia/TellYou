package org.com.modules.session.service;

import org.com.modules.session.domain.vo.req.*;
import org.com.modules.session.domain.vo.resp.SimpleGroupInfoList;

import java.util.List;

public interface GroupInfoService {
    void assignOwner(AssignOwnerReq req);

    void dissolveGroup(DissolveGroupReq req);

    void transferOwner(TransferOwnerReq req);

    void modifyName(ModifyNameReq req);

    void modifyNotification(ModifyNotificationReq req);

    void modifyCard(ModifyCardReq req);

    void banChat(BanChatReq req);

    SimpleGroupInfoList getBaseInfoList(List<Long> groupIds);
}

