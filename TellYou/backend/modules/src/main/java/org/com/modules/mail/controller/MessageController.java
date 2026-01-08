package org.com.modules.mail.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.mail.domain.vo.req.AckBatchConfirmReq;
import org.com.modules.mail.domain.vo.resp.PullMessageResp;
import org.com.modules.mail.service.PullService;
import org.springframework.web.bind.annotation.*;

/**
 * @author lanye
 * @since 2025/07/31
 */
@Slf4j
@Tag(name = "消息管理接口")
@RestController("messageController")
@RequestMapping("/message")
@RequiredArgsConstructor
public class MessageController {
    private final PullService pullService;

    @GetMapping("/pull-mailbox")
    @Operation(summary = "拉取信箱消息")
    public ApiResult<PullMessageResp> pullMailboxMessage(){
        Long userId = RequestHolder.get().getUid();
        return ApiResult.success(pullService.pullBox(userId));
    }

    @PostMapping("/ack-confirm")
    @Operation(summary = "ack 确认")
    public ApiResult<Void> confirmMailboxMessage(@RequestBody AckBatchConfirmReq ackBatchConfirmReq){
        pullService.ackBatchConfirm(RequestHolder.get().getUid(), ackBatchConfirmReq.getMessageIdList());
        return ApiResult.success();
    }
}
