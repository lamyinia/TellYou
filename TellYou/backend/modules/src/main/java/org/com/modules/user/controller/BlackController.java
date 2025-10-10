package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "黑名单关系接口")
@RestController("blackController")
@RequestMapping("/black")
@RequiredArgsConstructor
public class BlackController {

    @GetMapping("/pull-blacklist")
    @Operation(summary = "拉取黑名单信息")
    public ApiResult<Void> pullBlacklist(){
        return ApiResult.success();
    }
}
