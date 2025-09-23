package org.com.modules.user.controller;

import cn.hutool.core.util.URLUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.service.upload.UploadFileService;
import org.com.modules.user.domain.vo.req.LoginReq;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.service.UserInfoService;
import org.com.tools.constant.UploadUrlConstant;
import org.com.tools.properties.MinioProperties;
import org.com.tools.template.MinioTemplate;
import org.com.tools.utils.JsonUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "用户账号管理")
@RestController("accountController")
@RequestMapping("/userAccount")
@RequiredArgsConstructor
public class AccountController {
    private final UserInfoService userInfoService;
    private final UploadFileService uploadFileService;
    private final MinioTemplate minioTemplate;
    private final MinioProperties minioProperties;

    @PostMapping("/login")
    @Operation(summary = "登录")
    @FlowControl(time = 1, unit = TimeUnit.MINUTES, count = 1, target = FlowControl.Target.IP)
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
    public ApiResult<Void> test(Long uid){
        String path = URLUtil.getPath("http://113.44.158.255:32788/lanye/avatar/thumb/1948031012053333361/1/index.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256");
        log.info(path);
        log.info(Arrays.toString(path.split("/")));
        return ApiResult.success();
    }
}


