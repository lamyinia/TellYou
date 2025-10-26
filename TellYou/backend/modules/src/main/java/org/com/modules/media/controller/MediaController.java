package org.com.modules.media.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.domain.vo.resp.*;
import org.com.modules.media.domain.vo.req.*;
import org.com.modules.media.domain.vo.resp.*;
import org.com.modules.media.service.sign.SignService;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.user.service.UserInfoService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/media")
@Tag(name = "media 相关接口")
@RequiredArgsConstructor
public class MediaController {
    private final SignService signService;
    private final UserInfoService userInfoService;

    @GetMapping("/user-avatar/upload-url")
    @Operation(summary = "获取用户头像上传预签名URL")
    public ApiResult<AvatarUploadResp> getUserAvatarUploadUrl(@Valid @ModelAttribute AvatarUploadReq req){
        return ApiResult.success(signService.getUserAvatarUploadResp(req));
    }

    @GetMapping("/group-avatar/upload-url")
    @Operation(summary = "获取群头像上传预签名URL")
    public ApiResult<AvatarUploadResp> getGroupAvatarUploadUrl(@Valid @ModelAttribute AvatarUploadReq req){
        return ApiResult.success(signService.getGroupAvatarUploadResp(req));
    }

    @GetMapping("/picture/upload-url")
    @Operation(summary = "获取图片上传预签名URL")
    public ApiResult<PictureUploadResp> getPictureUploadUrl(@Valid @ModelAttribute PictureUploadReq req){
        return ApiResult.success(signService.getPictureUploadResp(req));
    }

    @GetMapping("/voice/upload-url")
    @Operation(summary = "获取语音上传预签名URL")
    public ApiResult<VoiceUploadResp> getVoiceUploadUrl(@Valid @ModelAttribute VoiceUploadReq req){
        return ApiResult.success(signService.getVoiceUploadResp(req));
    }

    @GetMapping("/video/upload-url")
    @Operation(summary = "获取视频上传预签名URL")
    public ApiResult<VideoUploadResp> getVideoUploadUrl(@Valid @ModelAttribute VideoUploadReq req){
        return ApiResult.success(signService.getVideoUploadResp(req));
    }

    @GetMapping("/file/upload-url")
    @Operation(summary = "获取文件上传预签名URL")
    public ApiResult<FileUploadResp> getFileUploadUrl(@Valid @ModelAttribute FileUploadReq req){
        return ApiResult.success(signService.getFileUploadResp(req));
    }


    /*  头像上传示例 ：{
        "fromId": 1948031012053333361,
        "originalUploadUrl": "avatar/original/1948031012053333361/5/index.png",
        "thumbnailUploadUrl": "avatar/thumb/1948031012053333361/5/index.png"
        }   */
    @PostMapping("/user-avatar/upload-confirm")
    @Operation(summary = "确认头像上传完成，更新头像版本号")
    public ApiResult<Void> confirmAvatarUpload(@Check @Valid @RequestBody AvatarUploadConfirmReq req){
        userInfoService.confirmAvatarUpload(RequestHolder.get().getUid(), req);
        return ApiResult.success();
    }

    @PostMapping("/picture/upload-confirm")
    @Operation(summary = "确认图片上传完成")
    public ApiResult<Void> confirmPictureUpload(@Check @Valid @RequestBody PictureUploadConfirmReq req){
        signService.confirmPictureUpload(req);
        return ApiResult.success();
    }

    @PostMapping("/voice/upload-confirm")
    @Operation(summary = "确认语音上传完成")
    public ApiResult<Void> confirmVoiceUpload(@Check @Valid @RequestBody VoiceUploadConfirmReq req){
        signService.confirmVoiceUpload(req);
        return ApiResult.success();
    }

    @PostMapping("/video/upload-confirm")
    @Operation(summary = "确认视频上传完成")
    public ApiResult<Void> confirmVideoUpload(@Check @Valid @RequestBody VideoUploadConfirmReq req){
        signService.confirmVideoUpload(req);
        return ApiResult.success();
    }

    @PostMapping("/file/upload-confirm")
    @Operation(summary = "确认文件传完成")
    public ApiResult<Void> confirmFileUpload(@Check @Valid @RequestBody FileUploadConfirmReq req){
        signService.confirmFileUpload(req);
        return ApiResult.success();
    }
}
