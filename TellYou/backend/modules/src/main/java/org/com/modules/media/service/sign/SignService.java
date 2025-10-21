package org.com.modules.media.service.sign;

import org.com.modules.media.domain.vo.req.*;
import org.com.modules.media.domain.vo.resp.*;

public interface SignService {
    AvatarUploadResp getUserAvatarUploadResp(AvatarUploadReq req);

    PictureUploadResp getPictureUploadResp(PictureUploadReq req);

    VoiceUploadResp getVoiceUploadResp(VoiceUploadReq req);

    VideoUploadResp getVideoUploadResp(VideoUploadReq req);

    FileUploadResp getFileUploadResp(FileUploadReq req);

    void confirmPictureUpload(PictureUploadConfirmReq req);

    void confirmVoiceUpload(VoiceUploadConfirmReq req);

    void confirmVideoUpload(VideoUploadConfirmReq req);

    void confirmFileUpload(FileUploadConfirmReq req);

    AvatarUploadResp getGroupAvatarUploadResp(AvatarUploadReq req);
}
