package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.common.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "用户关系管理接口")
@RestController("userContactController")
@RequestMapping("/contact")
@RequiredArgsConstructor
public class UserContactController {


    public ApiResult apply(){
        return ApiResult.success();
    }

    @GetMapping("/test")
    @Operation(summary = "测试")
    public ApiResult test(){
        return ApiResult.success();
    }
}
