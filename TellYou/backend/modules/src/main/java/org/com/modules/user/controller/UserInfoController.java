package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.tools.common.ApiResult;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "用户信息管理接口")
@RestController("userInfoController")
@RequestMapping("/userInfo")
@RequiredArgsConstructor
public class UserInfoController {

    @Operation(description = "测试")
    @PostMapping("/test")
    public ApiResult<Void> Test(@Valid @RequestBody RegisterReq req){
        log.info(req.toString());
        return ApiResult.success();
    }
}
