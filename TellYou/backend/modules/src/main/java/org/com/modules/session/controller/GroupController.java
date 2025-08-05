package org.com.modules.session.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.annotation.Unify;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.session.domain.vo.req.*;
import org.com.modules.session.service.GroupContactService;
import org.com.modules.session.service.GroupInfoService;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * @author lanye
 * @date 2025/07/31
 */
@Slf4j
@Tag(name = "群组管理接口")
@RestController("groupController")
@RequestMapping("/group")
@RequiredArgsConstructor
public class GroupController {
    private final GroupContactService groupContactService;
    private final GroupInfoService groupInfoService;

    @PostMapping("/createGroup")
    @Operation(summary = "创建群聊")
    @FlowControl(time = 3, unit = TimeUnit.MINUTES, count = 3, target = FlowControl.Target.UID)
    public ApiResult<Void> createGroup(@Unify @Valid @RequestBody CreateGroupReq req){
        groupContactService.createGroup(req);
        return ApiResult.success();
    }

    @PostMapping("/invite")
    @Operation(summary = "邀请好友")
    public ApiResult<Void> invite(@Valid @RequestBody InviteFriendReq req){
        return ApiResult.success();
    }

    @PostMapping("/apply")
    @Operation(summary = "入群申请")
    public ApiResult<Void> apply(@Valid @RequestBody GroupApplyReq req){
        return ApiResult.success();
    }

    @DeleteMapping("/dissolveGroup")
    @Operation(summary = "解散群聊")
    public ApiResult<Void> dissolveGroup(@Valid @RequestBody DissolveGroupReq req){
        return ApiResult.success();
    }

    @DeleteMapping("/leaveGroup")
    @Operation(summary = "退群")
    public ApiResult<Void> leaveGroup(@Valid @RequestBody LeaveGroupReq req){
        return ApiResult.success();
    }

    @DeleteMapping("/kickOut")
    @Operation(summary = "踢出群聊")
    public ApiResult<Void> kickOut(@Valid @RequestBody KickMemberReq req){
        return ApiResult.success();
    }

    @PutMapping("/modifyName")
    @Operation(summary = "修改群名称")
    public ApiResult<Void> modifyName(@Valid @RequestBody ModifyNameReq req){
        return ApiResult.success();
    }

    @PutMapping("/modifyNotification")
    @Operation(summary = "修改群公告")
    public ApiResult<Void> modifyNotification(@Valid @RequestBody ModifyNotificationReq req){
        return ApiResult.success();
    }

    @PutMapping("/modifyCard")
    @Operation(summary = "修改群卡片")
    public ApiResult<Void> modifyCard(@Valid @RequestBody ModifyCardReq req){
        return ApiResult.success();
    }

    /**
     * 设置禁言后，只有群主和管理员可以发言
     * @return {@link ApiResult }<{@link Void }>
     */
    @PutMapping("/banChat")
    @Operation(summary = "禁言开关")
    public ApiResult<Void> banChat(@Valid @RequestBody BanChatReq req){
        return ApiResult.success();
    }

    @PutMapping("/assignOwner")
    @Operation(summary = "指定备选群主")
    public ApiResult<Void> assignOwner(@Valid @RequestBody AssignOwnerReq req) {
        groupInfoService.assignOwner(req);
        return ApiResult.success();
    }

    @PutMapping("/transferOwner")
    @Operation(summary = "转让群主")
    public ApiResult<Void> transferOwner(@Valid @RequestBody TransferOwnerReq req){

        return ApiResult.success();
    }

    @PutMapping("/addManager")
    @Operation(summary = "添加管理员")
    public ApiResult<Void> addManager(@Valid @RequestBody AddManagerReq req){
        return ApiResult.success();
    }

    @PutMapping("/withdrawManager")
    @Operation(summary = "撤销管理员")
    public ApiResult<Void> withdrawManager(@Valid @RequestBody WithdrawManagerReq req){
        return ApiResult.success();
    }

    @GetMapping("/detail")
    @Operation(summary = "群组详情")
    public ApiResult<Void> detail(){
        return ApiResult.success();
    }

    @GetMapping("/memberDetail")
    @Operation(summary = "群成员列表")
    public ApiResult<Void> memberDetail(){
        return ApiResult.success();
    }

    @GetMapping("/SearchGid")
    @Operation(summary = "查询群组")
    public ApiResult<Void> SearchGid(){
        return ApiResult.success();
    }

}
