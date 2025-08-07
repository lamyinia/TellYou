package org.com.modules.common.service.oss.impl;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.enums.OssSceneEnum;
import org.com.modules.common.domain.vo.req.UploadUrlReq;
import org.com.modules.common.service.oss.OssService;
import org.com.tools.template.MinioTemplate;
import org.com.tools.template.domain.OssReq;
import org.com.tools.template.domain.OssResp;
import org.com.tools.utils.AssertUtil;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OssServiceImpl implements OssService {
    private final MinioTemplate minioTemplate;

    @Override
    public OssResp getUploadUrl(Long uid, UploadUrlReq req) {
        OssSceneEnum sceneEnum = OssSceneEnum.of(req.getScene());

        AssertUtil.isNotEmpty(sceneEnum, "场景有误");
        OssReq ossReq = OssReq.builder()
                .fileName(req.getFileName())
                .filePath(sceneEnum.getPath())
                .uid(uid)
                .build();
        return minioTemplate.getPreSignedObjectUrl(ossReq);
    }
}
