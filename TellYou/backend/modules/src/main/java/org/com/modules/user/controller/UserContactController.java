package org.com.modules.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.user.domain.vo.req.AcceptFriendApplyReq;
import org.com.modules.user.domain.vo.req.FriendApplyReq;
import org.com.modules.user.service.UserContactService;
import org.com.modules.common.domain.vo.resp.ApiResult;
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
    public ApiResult<Void> applySend(@Unify @Valid @RequestBody FriendApplyReq friendApplyReq){
        userContactService.friendApplySend(friendApplyReq.getFromUid(), friendApplyReq);
        return ApiResult.success();
    }

    @PutMapping("/applyAccept")
    @Operation(summary = "接受申请")
    public ApiResult<Void> applyAccept(@Valid @RequestBody AcceptFriendApplyReq req){
        userContactService.applyAccept(req);
        return ApiResult.success();
    }

    @PutMapping("/pullBlackList")
    @Operation(summary = "拉入黑名单")
    public ApiResult<Void> pullBlackList(){
        return ApiResult.success();
    }
    @PutMapping("/removeBlackList")
    @Operation(summary = "移除黑名单")
    public ApiResult<Void> removeBlackList(){
        return ApiResult.success();
    }

    @DeleteMapping("/deleteContact")
    @Operation(summary = "删除好友")
    public ApiResult<Void> deleteContact(){
        return ApiResult.success();
    }

    @GetMapping("/pageContact")
    @Operation(summary = "联系人或者群组的分页查询")
    public ApiResult<Void> pageContact(){
        return ApiResult.success();
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
