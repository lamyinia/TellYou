package org.com.modules.session.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "文件等资源接口")
@RestController("commonController")
@RequestMapping("/common")
@RequiredArgsConstructor
public class CommonController {

    @GetMapping("/upload/url")
    @Operation(summary = "获取临时上传的链接")
    public ApiResult<Void> getUploadUrl() {
        return ApiResult.success();
    }
}
