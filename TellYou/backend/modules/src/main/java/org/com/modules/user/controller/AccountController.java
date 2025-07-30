package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.com.modules.user.domain.vo.req.LoginReq;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.service.UserInfoService;
import org.com.tools.common.ApiResult;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "用户账号管理")
@RestController("accountController")
@RequestMapping("/userAccount")
@RequiredArgsConstructor
public class AccountController {
    private final UserInfoService userInfoService;
    private final RocketMQTemplate rocketMQTemplate;
    private final MongoTemplate mongoTemplate;

    @PostMapping("/login")
    @Operation(summary = "登录")
    public ApiResult<LoginResp> login(@Valid @RequestBody LoginReq loginReq) {
        LoginResp loginResp = userInfoService.login(loginReq);
        return ApiResult.success(loginResp);
    }

    @PostMapping("/register")
    @Operation(summary = "注册")
    public void register(@Valid @RequestBody RegisterReq registerReq) {
        userInfoService.register(registerReq);
    }

    @PostMapping("/register/checkcode/{emailAddress}")
    @Operation(summary = "请求注册验证码")
    public ApiResult<Void> checkCodeRequest(@PathVariable String emailAddress) {
        log.info("给 {} 发送验证码", emailAddress);
        userInfoService.getCheckCode(emailAddress);
        return ApiResult.success();
    }


    @GetMapping("/test")
    @Operation(summary = "测试")
    public ApiResult<Void> test(){
        String dbName = mongoTemplate.getDb().getName();
        log.info("✅ 成功连接数据库: ");
        mongoTemplate.getCollectionNames().forEach(log::info);
        return ApiResult.success();
    }
}


