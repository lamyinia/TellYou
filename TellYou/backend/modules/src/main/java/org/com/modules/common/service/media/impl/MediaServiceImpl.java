package org.com.modules.common.service.media.impl;

import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.vo.req.AvatarUploadReq;
import org.com.modules.common.domain.vo.resp.AvatarUploadResp;
import org.com.modules.common.service.media.MediaService;
import org.com.modules.common.util.RequestHolder;
import org.com.tools.constant.UploadUrlConstant;
import org.com.tools.template.MinioTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {
    private final MinioTemplate minioTemplate;

    @Override
    public AvatarUploadResp getAvatarUploadResp(AvatarUploadReq req) {
        String uid = String.valueOf(RequestHolder.get().getUid());

        String originalUploadUrl = minioTemplate.getPreSignedObjectUrl(UploadUrlConstant.originalAvatarPath + uid + req.getFileSuffix());
        String thumbnailUploadUrl = minioTemplate.getPreSignedObjectUrl(UploadUrlConstant.thumbedAvatarPath + uid + req.getFileSuffix());

        return new AvatarUploadResp(originalUploadUrl, thumbnailUploadUrl);
    }
}
