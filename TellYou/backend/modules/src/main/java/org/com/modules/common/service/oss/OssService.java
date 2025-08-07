package org.com.modules.common.service.oss;

import org.com.modules.common.domain.vo.req.UploadUrlReq;
import org.com.tools.template.domain.OssResp;

public interface OssService {
    OssResp getUploadUrl(Long uid, UploadUrlReq req);
}
