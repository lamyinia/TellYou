package org.com.modules.common.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.domain.vo.req.AvatarUploadConfirmReq;
import org.com.modules.common.domain.vo.req.AvatarUploadReq;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.domain.vo.resp.AvatarUploadResp;
import org.com.modules.common.service.media.MediaService;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.user.service.UserInfoService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/media")
@Tag(name = "media 相关接口")
@RequiredArgsConstructor
public class MediaController {
    private final MediaService mediaService;
    private final UserInfoService userInfoService;

    // TODO TEST
    @GetMapping("/avatar/upload-url")
    @Operation(summary = "获取头像上传预签名URL")
    public ApiResult<AvatarUploadResp> getAvatarUploadUrl(@Valid @RequestBody AvatarUploadReq req){
        return ApiResult.success(mediaService.getAvatarUploadResp(req));
    }

    // TODO TEST
    @PostMapping("/avatar/upload-confirm")
    @Operation(summary = "确认头像上传完成，更新头像版本号")
    public ApiResult<Void> confirmAvatarUpload(@Check @Valid @RequestBody AvatarUploadConfirmReq req){
        userInfoService.confirmAvatarUpload(RequestHolder.get().getUid(), req);
        return ApiResult.success();
    }


}
