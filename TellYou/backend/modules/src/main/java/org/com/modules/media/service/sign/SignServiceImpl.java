package org.com.modules.media.service.sign;

import cn.hutool.core.util.ArrayUtil;
import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.media.domain.vo.req.*;
import org.com.modules.media.domain.vo.resp.*;
import org.com.modules.user.dao.UserInfoDao;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.service.adapter.UserInfoAdapter;
import org.com.tools.constant.UrlConstant;
import org.com.tools.constant.ValueConstant;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.JsonUtils;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class SignServiceImpl implements SignService {
    private final MinioTemplate minioTemplate;
    private final UserInfoDao userInfoDao;
    private final String[] needCompressedSuffix = {".webp", ".gif", ".avif"};

    @Override
    public AvatarUploadResp getAvatarUploadResp(AvatarUploadReq req) {
        String uid = String.valueOf(RequestHolder.get().getUid());

        String identifierJson = userInfoDao.getIdentifierById(RequestHolder.get().getUid());
        Map<String, Object> identifier = JsonUtils.toMap(identifierJson);
        if (identifier == null) {
            identifier = UserInfoAdapter.getDefaultIdentifier();
            userInfoDao.lambdaUpdate()
                    .eq(UserInfo::getUserId, RequestHolder.get().getUid())
                    .set(UserInfo::getIdentifier, identifier)
                    .update();
        }
        String next = String.valueOf((Integer) identifier.get(ValueConstant.DEFAULT_AVATAR_VERSION_KEY) + 1);

        String originalUploadUrl = minioTemplate
                .getPreSignedObjectUrl(UrlConstant.originalAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                        + ValueConstant.SINGLE_FILE + getOriginalAvatarSuffix(req.getFileSuffix()));
        String thumbnailUploadUrl = minioTemplate
                .getPreSignedObjectUrl(UrlConstant.thumbedAvatarPath + uid + StrUtil.SLASH + next + StrUtil.SLASH
                        + ValueConstant.SINGLE_FILE + getThumbedAvatarSuffix());

        return new AvatarUploadResp(originalUploadUrl, thumbnailUploadUrl);
    }

    public String getOriginalAvatarSuffix(String suffix){
        if (ArrayUtil.contains(needCompressedSuffix, suffix)) return ".avif";  // 就算是原图，动图也需要压缩
        else return suffix;
    }
    public String getThumbedAvatarSuffix(){
        return ".avif";
    }



    @Override
    public PictureUploadResp getPictureUploadResp(PictureUploadReq req) {
        return null;
    }

    @Override
    public FileUploadResp getFileUploadResp(FileUploadReq req) {
        return null;
    }

    @Override
    public VideoUploadResp getVideoUploadResp(VideoUploadReq req) {
        return null;
    }

    @Override
    public VoiceUploadResp getVoiceUploadResp(VoiceUploadReq req) {
        return null;
    }

    @Override
    public void confirmPictureUpload(PictureUploadConfirmReq req) {

    }

    @Override
    public void confirmVoiceUpload(VoiceUploadConfirmReq req) {

    }

    @Override
    public void confirmVideoUpload(VideoUploadConfirmReq req) {

    }

    @Override
    public void confirmFileUpload(FileUploadConfirmReq req) {

    }
}
