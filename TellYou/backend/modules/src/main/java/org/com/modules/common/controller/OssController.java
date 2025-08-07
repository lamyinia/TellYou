package org.com.modules.common.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.com.modules.common.domain.vo.req.UploadUrlReq;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.service.oss.OssService;
import org.com.modules.common.util.RequestHolder;
import org.com.tools.template.domain.OssResp;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/oss")
@Tag(name = "oss 相关接口")
@RequiredArgsConstructor
public class OssController {
    private final OssService ossService;

    @GetMapping("/upload/url")
    @Operation(summary = "获取临时上传链接")
    public ApiResult<OssResp> getUploadUrl(@Valid UploadUrlReq req) {
        return ApiResult.success(ossService.getUploadUrl(RequestHolder.get().getUid(), req));
    }
}
