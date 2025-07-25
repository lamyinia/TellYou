package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.chat.domain.dto.ChatMessageDTO;
import org.com.modules.user.domain.dto.LoginDTO;
import org.com.modules.user.domain.dto.RegisterDTO;
import org.com.modules.user.domain.vo.LoginVO;
import org.com.modules.user.service.UserInfoService;
import org.com.tools.common.ApiResult;
import org.com.tools.constant.MQConstant;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@Slf4j
@Tag(name = "用户账号管理")
@RestController("userController")
@RequestMapping("/userAccount")
@RequiredArgsConstructor
public class AccountController {
    private final UserInfoService userInfoService;
    private final RocketMQTemplate rocketMQTemplate;

    @PostMapping("/login")
    @Operation(summary = "登录")
    public ApiResult login(@Valid @RequestBody LoginDTO loginDTO) {
        LoginVO loginVO = userInfoService.login(loginDTO);
        return ApiResult.success(loginVO);
    }

    @PostMapping("/register")
    @Operation(summary = "注册")
    public void register(@Valid @RequestBody RegisterDTO registerDTO) {
        userInfoService.register(registerDTO);
    }

    @PostMapping("/register/checkcode/{emailAddress}")
    @Operation(summary = "请求注册验证码")
    public ApiResult checkCodeRequest(@PathVariable String emailAddress) {
        log.info("给 {} 发送验证码", emailAddress);
        userInfoService.getCheckCode(emailAddress);
        return ApiResult.success();
    }

    // TODO reconnect重连token 拿ip

    @PostMapping("/test")
    @Operation(summary = "测试")
    public ApiResult test(@RequestBody ChatMessageDTO dto){
        log.info("测试消息: {}", dto.toString());
        rocketMQTemplate.convertAndSend(MQConstant.DELIVER_TOPIC, dto);
        return ApiResult.success();
    }
}


