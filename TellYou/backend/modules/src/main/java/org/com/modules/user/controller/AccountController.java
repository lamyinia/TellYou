package org.com.modules.user.controller;

import cn.hutool.core.util.URLUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.media.service.minio.DownloadService;
import org.com.modules.media.service.minio.UploadFileService;
import org.com.modules.user.domain.vo.req.LoginReq;
import org.com.modules.user.domain.vo.req.RegisterReq;
import org.com.modules.user.domain.vo.resp.LoginResp;
import org.com.modules.user.service.UserInfoService;
import org.com.tools.properties.MinioProperties;
import org.com.tools.template.MinioTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "用户账号管理")
@RestController("accountController")
@RequestMapping("/user-account")
@RequiredArgsConstructor
public class AccountController {
    private final UserInfoService userInfoService;
    private final DownloadService downloadService;
    private final UploadFileService uploadFileService;

    private final MinioTemplate minioTemplate;
    private final MinioProperties minioProperties;

    @PostMapping("/login")
    @Operation(summary = "登录")
    @FlowControl(time = 1, unit = TimeUnit.MINUTES, count = 3, target = FlowControl.Target.IP)
    public ApiResult<LoginResp> login(@Valid @RequestBody LoginReq loginReq) {
        LoginResp loginResp = userInfoService.login(loginReq);
        return ApiResult.success(loginResp);
    }

    @PostMapping("/register")
    @Operation(summary = "注册")
    public ApiResult<Void> register(@Valid @RequestBody RegisterReq registerReq) {
        userInfoService.register(registerReq);
        return ApiResult.success();
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
        log.info(path);  // info: /lanye/avatar/thumb/1948031012053333361/1/index.jpg

//        Map<String, Object> map = new HashMap<>();
//        map.put("avatarVersion", 5);
//        map.put("nicknameVersion", 3);
//        uploadFileService.writeAtomJson(String.valueOf(uid), map);

        Map<String, Object> map = downloadService.getAtomJson(String.valueOf(uid));
        log.info(map.toString());

        return ApiResult.success();
    }
}


