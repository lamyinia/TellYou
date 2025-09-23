package org.com.modules.common.service.media.impl;

import cn.hutool.core.io.file.PathUtil;
import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.vo.req.AvatarUploadReq;
import org.com.modules.common.domain.vo.resp.AvatarUploadResp;
import org.com.modules.common.service.media.MediaService;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.user.dao.UserInfoDao;
import org.com.tools.constant.UploadUrlConstant;
import org.com.tools.constant.ValueConstant;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.JsonUtils;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {
    private final MinioTemplate minioTemplate;
    private final UserInfoDao userInfoDao;

    @Override
    public AvatarUploadResp getAvatarUploadResp(AvatarUploadReq req) {
            String uid = String.valueOf(RequestHolder.get().getUid());

            String next = String.valueOf((Integer) JsonUtils
                    .toMap(userInfoDao.getIdentifierById(RequestHolder.get().getUid()))
                    .get(ValueConstant.DEFAULT_AVATAR_VERSION_KEY) + 1);

            String originalUploadUrl = minioTemplate
                    .getPreSignedObjectUrl(UploadUrlConstant.originalAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                    + ValueConstant.SINGLE_FILE + req.getFileSuffix());
            String thumbnailUploadUrl = minioTemplate
                    .getPreSignedObjectUrl(UploadUrlConstant.thumbedAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                    + ValueConstant.SINGLE_FILE + req.getFileSuffix());

            return new AvatarUploadResp(originalUploadUrl, thumbnailUploadUrl);
    }
}
