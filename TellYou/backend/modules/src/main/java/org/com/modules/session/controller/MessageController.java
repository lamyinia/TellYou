package org.com.modules.session.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.springframework.web.bind.annotation.*;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "消息管理接口")
@RestController("messageController")
@RequestMapping("/message")
@RequiredArgsConstructor
public class MessageController {

    @GetMapping("/pullMailboxMessage")
    @Operation(summary = "拉取信箱消息")
    public ApiResult<Void> pullMailboxMessage(){
        return ApiResult.success();
    }

    @GetMapping("/pullHistoryMessage")
    @Operation(summary = "全量拉取历史消息")
    public ApiResult<Void> pullHistoryMessage(){
        return ApiResult.success();
    }

    @PutMapping("/withdrawMessage")
    @Operation(summary = "撤回消息")
    public ApiResult<Void> withdrawMessage(){
        return ApiResult.success();
    }

    @PutMapping("/pullSessionMessage")
    @Operation(summary = "拉取某个会话的消息")
    public ApiResult<Void> pullSessionMessage(){
        return ApiResult.success();
    }
}
