package org.com.modules.session.service;

import org.com.modules.session.domain.vo.req.AssignOwnerReq;
import org.com.modules.session.domain.vo.req.DissolveGroupReq;

public interface GroupInfoService {
    void assignOwner(AssignOwnerReq req);

    void dissolveGroup(DissolveGroupReq req);
}
