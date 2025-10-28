package org.com.modules.contact.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.domain.vo.req.CursorPageReq;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.common.domain.vo.resp.CursorPageResp;
import org.com.modules.common.util.RequestHolder;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.contact.domain.vo.req.*;
import org.com.modules.contact.domain.vo.resp.FriendContactResp;
import org.com.modules.contact.domain.vo.resp.PullFriendContactResp;
import org.com.modules.contact.service.UserContactService;
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

    @GetMapping("/pull-contact")
    @Operation(description = "拉取好友关系、群组关系")
    public ApiResult<PullFriendContactResp> pullFriendContact(){
        PullFriendContactResp resp = userContactService.pullFriendContact(RequestHolder.get().getUid());
        return ApiResult.success(resp);
    }

    @GetMapping("/cursor-pull-application")
    @Operation(description = "游标拉取申请通知")
    public ApiResult<CursorPageResp<ContactApply>> CursorPullApplication(@ModelAttribute @Valid CursorPageReq req){
        CursorPageResp<ContactApply> resp = userContactService.ApplyInfoListByCursor(req);
        log.info("{} 游标拉取结果：{}", RequestHolder.get().getUid(), resp.toString());
        return ApiResult.success(resp);
    }

    @PostMapping("/friend-send-apply")
    @Operation(description = "发送好友申请")
    public ApiResult<Void> applySend(@Check @Valid @RequestBody FriendApplyReq friendApplyReq){
        userContactService.friendApplySend(friendApplyReq.getFromUserId(), friendApplyReq);
        return ApiResult.success();
    }

    @PutMapping("/friend-accept-apply")
    @Operation(summary = "接受申请")
    public ApiResult<Void> applyAccept(@Check @Valid @RequestBody AcceptFriendApplyReq req){
        userContactService.applyAccept(req);
        return ApiResult.success();
    }

    @PostMapping("/pull-black-list")
    @Operation(summary = "拉入黑名单")
    public ApiResult<Void> pullBlackList(@Check @Valid @RequestBody PullBlackListReq req){
        userContactService.pullBlackList(req);
        return ApiResult.success();
    }

    @DeleteMapping("/remove-black-list")
    @Operation(summary = "移除黑名单")
    public ApiResult<Void> removeBlackList(@Check @Valid @RequestBody RemoveBlackListReq req){
        userContactService.removeBlackList(req);
        return ApiResult.success();
    }

    @DeleteMapping("/delete-contact")
    @Operation(summary = "删除好友")
    public ApiResult<Void> deleteContact(@Check @Valid @RequestBody DeleteContactReq req){
        userContactService.deleContact(req);
        return ApiResult.success();
    }

    @GetMapping("/page-contact")
    @Operation(summary = "联系人或者群组的分页查询")
    public ApiResult<CursorPageResp<FriendContactResp>> pageContact(@ModelAttribute @Valid CursorPageReq req){
        return ApiResult.success(userContactService.friendListPage(req));
    }

    @GetMapping("/test")
    @Operation(summary = "测试")
    public ApiResult<Void> test(){
        return ApiResult.success();
    }

}
