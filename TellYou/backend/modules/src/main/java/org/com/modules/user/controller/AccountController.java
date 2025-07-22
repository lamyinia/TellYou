package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.user.domain.dto.RegisterDTO;
import org.com.modules.user.service.UserInfoService;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "用户账号管理")
@RestController("userController")
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {
    private final UserInfoService userInfoService;

    @GetMapping("/login")
    @Operation(summary = "登录")
    public String login(){
        return "success";
    }

    @PostMapping("/register")
    @Operation(summary = "注册")
    public void register(@RequestBody RegisterDTO registerDTO){

    }

    @GetMapping("/register/checkcode{emailAddress}")
    @Operation(summary = "请求注册验证码")
    public void checkCodeRequest(@PathVariable String emailAddress){
        userInfoService.getCheckCode(emailAddress);
    }
}


