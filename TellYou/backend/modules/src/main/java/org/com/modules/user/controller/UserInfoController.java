package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.tools.common.ApiResult;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "用户信息管理接口")
@RestController("userInfoController")
@RequestMapping("/userInfo")
@RequiredArgsConstructor
public class UserInfoController {

    @PutMapping("/modifyNickName")
    @Operation(summary = "名字修改")
    public ApiResult<Void> modifyNickName(){
        return ApiResult.success();
    }

    @PutMapping("/modifyAvatar")
    @Operation(summary = "头像修改")
    public ApiResult<Void> modifyAvatar(){
        return ApiResult.success();
    }

    @PutMapping("/modifySignature")
    @Operation(summary = "签名修改")
    public ApiResult<Void> modifySignature(){
        return ApiResult.success();
    }

    @PutMapping("/modifyPassword")
    @Operation(summary = "密码修改")
    public ApiResult<Void> modifyPassword(){
        return ApiResult.success();
    }

    @GetMapping("/SearchUid")
    @Operation(summary = "查询用户")
    public ApiResult<Void> SearchUid(){
        return ApiResult.success();
    }


    @PostMapping("/test")
    @Operation(summary = "测试")
    public ApiResult<Void> Test(@Valid @RequestBody RegisterReq req){
        log.info(req.toString());
        return ApiResult.success();
    }
}
