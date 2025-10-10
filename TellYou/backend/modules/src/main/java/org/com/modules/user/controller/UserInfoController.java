package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.Check;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.user.domain.vo.resp.SearchByUidResp;
import org.com.modules.user.domain.vo.resp.SimpleUserInfoList;
import org.com.modules.user.service.UserInfoService;
import org.springframework.web.bind.annotation.*;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "用户信息管理接口")
@RestController("userInfoController")
@RequestMapping("/user-info")
@RequiredArgsConstructor
public class UserInfoController {
    private final UserInfoService userInfoService;

    @PostMapping("/base-info-list")
    @Operation(summary = "头像名字批量获取")
    public ApiResult<SimpleUserInfoList> getBaseInfoList(@RequestBody BaseInfoReq req){
        SimpleUserInfoList resp = userInfoService.getBaseInfoList(req.getTargetList());
        return null;
    }

    @PutMapping("/modify-nickname")
    @Operation(summary = "名字修改")
    public ApiResult<Void> modifyNickname(@Check @Valid @RequestBody ModifyNicknameReq req){
        userInfoService.modifyNickname(req);
        return ApiResult.success();
    }

    @PutMapping("/modify-signature")
    @Operation(summary = "签名修改")
    public ApiResult<Void> modifySignature(@Check @Valid @RequestBody ModifySignatureReq req){
        userInfoService.modifySignature(req);
        return ApiResult.success();
    }

    @PutMapping("/modify-password")
    @Operation(summary = "密码修改")
    public ApiResult<Void> modifyPassword(){
        return ApiResult.success();
    }

    @PostMapping("/search-by-uid")
    @Operation(summary = "查询用户")
    public ApiResult<SearchByUidResp> SearchByUid(@Check @Valid @RequestBody SearchByUidReq req){
        return ApiResult.success(userInfoService.SearchByUidResp(req));
    }

    @PostMapping("/test")
    @Operation(summary = "测试")
    public ApiResult<Void> Test(@Valid @RequestBody RegisterReq req){
        log.info(req.toString());
        return ApiResult.success();
    }
}
