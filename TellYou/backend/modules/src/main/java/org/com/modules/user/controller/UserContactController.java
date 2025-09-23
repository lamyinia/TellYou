package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.user.domain.vo.req.*;
import org.com.modules.user.domain.vo.resp.FriendContactResp;
import org.com.modules.user.service.UserContactService;
import org.springframework.web.bind.annotation.*;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "用户关系管理接口")
@RestController("userContactController")
@RequestMapping("/contact")
@RequiredArgsConstructor
public class UserContactController {
    private final UserContactService userContactService;

    @PostMapping("/applySend")
    @Operation(description = "发送好友申请")
    public ApiResult<Void> applySend(@Check @Valid @RequestBody FriendApplyReq friendApplyReq){
        userContactService.friendApplySend(friendApplyReq.getFromUid(), friendApplyReq);
        return ApiResult.success();
    }

    @PutMapping("/applyAccept")
    @Operation(summary = "接受申请")
    public ApiResult<Void> applyAccept(@Check @Valid @RequestBody AcceptFriendApplyReq req){
        userContactService.applyAccept(req);
        return ApiResult.success();
    }

    @PutMapping("/pullBlackList")
    @Operation(summary = "拉入黑名单")
    public ApiResult<Void> pullBlackList(@Check @Valid @RequestBody PullBlackListReq req){
        userContactService.pullBlackList(req);
        return ApiResult.success();
    }
    @DeleteMapping("/removeBlackList")
    @Operation(summary = "移除黑名单")
    public ApiResult<Void> removeBlackList(@Check @Valid @RequestBody RemoveBlackListReq req){
        userContactService.removeBlackList(req);
        return ApiResult.success();
    }

    @DeleteMapping("/deleteContact")
    @Operation(summary = "删除好友")
    public ApiResult<Void> deleteContact(@Check @Valid @RequestBody DeleteContactReq req){
        userContactService.deleContact(req);
        return ApiResult.success();
    }

    @GetMapping("/pageContact")
    @Operation(summary = "联系人或者群组的分页查询")
    public ApiResult<CursorPageResp<FriendContactResp>> pageContact(@ModelAttribute @Valid CursorPageReq req){
        return ApiResult.success(userContactService.friendListPage(req));
    }

    @GetMapping("/pageApply")
    @Operation(summary = "申请的分页查询")
    public ApiResult<Void> pageApply(){
        return ApiResult.success();
    }

    @GetMapping("/test")
    @Operation(summary = "测试")
    public ApiResult<Void> test(){
        return ApiResult.success();
    }

}
