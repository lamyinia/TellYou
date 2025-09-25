package org.com.modules.common.service.media;

import org.com.modules.common.domain.vo.req.*;
import org.com.modules.common.domain.vo.resp.*;

public interface MediaService {
    AvatarUploadResp getAvatarUploadResp(AvatarUploadReq req);

    PictureUploadResp getPictureUploadResp(PictureUploadReq req);

    VoiceUploadResp getVoiceUploadResp(VoiceUploadReq req);

    VideoUploadResp getVideoUploadResp(VideoUploadReq req);

    FileUploadResp getFileUploadResp(FileUploadReq req);

    void confirmPictureUpload(PictureUploadConfirmReq req);

    void confirmVoiceUpload(VoiceUploadConfirmReq req);

    void confirmVideoUpload(VideoUploadConfirmReq req);

    void confirmFileUpload(FileUploadConfirmReq req);
}
