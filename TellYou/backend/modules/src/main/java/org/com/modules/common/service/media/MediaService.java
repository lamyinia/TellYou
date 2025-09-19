package org.com.modules.common.service.media;

import org.com.modules.common.domain.vo.req.AvatarUploadReq;
import org.com.modules.common.domain.vo.resp.AvatarUploadResp;

public interface MediaService {
    AvatarUploadResp getAvatarUploadResp(AvatarUploadReq req);
}
