package org.com.modules.group.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.annotation.FlowControl;
import org.com.modules.common.annotation.Check;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.modules.contact.domain.entity.ContactApply;
import org.com.modules.group.domain.vo.req.*;
import org.com.modules.group.domain.vo.resp.SimpleGroupInfoList;
import org.com.modules.contact.service.GroupContactService;
import org.com.modules.group.service.GroupInfoService;
import org.com.modules.user.domain.vo.req.BaseInfoReq;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * @author lanye
 * @since 2025/07/31
 */
@Slf4j
@Tag(name = "群组管理接口")
@RestController("groupController")
@RequestMapping("/group")
@RequiredArgsConstructor
public class GroupController {
    private final GroupContactService groupContactService;
    private final GroupInfoService groupInfoService;


    @PostMapping("/base-info-list")
    @Operation(summary = "批量获取群名字、群头像，给客户端填充聊天室信息的接口") // TODO 如果一个人进了上万个群，这里拉取可能会有风险
    public ApiResult<SimpleGroupInfoList> getBaseInfoList(@RequestBody BaseInfoReq req){
        SimpleGroupInfoList resp = groupInfoService.getBaseInfoList(req.getTargetList());
        return ApiResult.success(resp);
    }

    @GetMapping("/member-info-list")
    @Operation(summary = "分页获取群成员 ID")
    public ApiResult<List<Long>> getMemberInfoList(@Check @Valid @ModelAttribute MemberInfoListReq req){
        List<Long> resp = groupInfoService.getMemberInfoList(req);
        return ApiResult.success(resp);
    }

    @GetMapping("/apply-list")
    @Operation(summary = "分页获取群成员申请表")
    public ApiResult<List<ContactApply>> getGroupApply(@Check @Valid @ModelAttribute GroupApplyListReq req){
        List<ContactApply> resp = groupInfoService.getGroupApply(req);
        return ApiResult.success(resp);
    }

    @PostMapping("/create-group")
    @Operation(summary = "创建群聊")
    @FlowControl(time = 3, unit = TimeUnit.MINUTES, count = 3, target = FlowControl.Target.UID)
    public ApiResult<Void> createGroup(@Check @Valid @RequestBody CreateGroupReq req){
        groupContactService.createGroup(req);
        return ApiResult.success();
    }

    @PostMapping("/invite")
    @Operation(summary = "邀请好友")
    public ApiResult<List<Long>> invite(@Check @Valid @RequestBody InviteFriendReq req){
        List<Long> resp = groupContactService.inviteFriend(req);
        return ApiResult.success(resp);
    }

    @PostMapping("/send-apply")
    @Operation(summary = "入群申请")
    public ApiResult<Void> apply(@Check @Valid @RequestBody GroupApplyReq req){
        groupContactService.applySend(req);
        return ApiResult.success();
    }

    @PutMapping("/accept-apply")
    @Operation(summary = "管理员/群主 接受入群申请")
    public ApiResult<List<Long>> accept(@Check @Valid @RequestBody GroupApplyAcceptReq req){
        List<Long> resp = groupContactService.acceptMember(req);
        return ApiResult.success(resp);
    }

    @DeleteMapping("/dissolve-group")
    @Operation(summary = "解散群聊")
    public ApiResult<Void> dissolveGroup(@Check @Valid @RequestBody DissolveGroupReq req){
        groupInfoService.dissolveGroup(req);
        return ApiResult.success();
    }

    @DeleteMapping("/leave-group")
    @Operation(summary = "退群")
    public ApiResult<Void> leaveGroup(@Check @Valid @RequestBody LeaveGroupReq req){
        groupContactService.leaveGroup(req);
        return ApiResult.success();
    }

    @DeleteMapping("/kick-out")
    @Operation(summary = "踢出群聊")
    public ApiResult<Void> kickOut(@Check @Valid @RequestBody KickMemberReq req){
        groupContactService.kickOut(req);
        return ApiResult.success();
    }

    @PutMapping("/modify-name")
    @Operation(summary = "修改群名称")
    public ApiResult<Void> modifyName(@Check @Valid @RequestBody ModifyNameReq req){
        groupInfoService.modifyName(req);
        return ApiResult.success();
    }

    @PutMapping("/modify-notification")
    @Operation(summary = "修改群公告")
    public ApiResult<Void> modifyNotification(@Check @Valid @RequestBody ModifyNotificationReq req){
        groupInfoService.modifyNotification(req);
        return ApiResult.success();
    }

    @PutMapping("/modify-card")
    @Operation(summary = "修改群卡片")
    public ApiResult<Void> modifyCard(@Check @Valid @RequestBody ModifyCardReq req){
        groupInfoService.modifyCard(req);
        return ApiResult.success();
    }

    /**
     * 设置禁言后，只有群主和管理员可以发言
     * @return {@link ApiResult }<{@link Void }>
     */
    @PutMapping("/ban-chat")
    @Operation(summary = "禁言开关")
    public ApiResult<Void> banChat(@Check @Valid @RequestBody BanChatReq req){
        groupInfoService.banChat(req);
        return ApiResult.success();
    }

    @PutMapping("/transfer-owner")
    @Operation(summary = "转让群主")
    public ApiResult<Void> transferOwner(@Check @Valid @RequestBody TransferOwnerReq req){
        groupInfoService.transferOwner(req);
        return ApiResult.success();
    }

    @PutMapping("/add-manager")
    @Operation(summary = "添加管理员")
    public ApiResult<Void> addManager(@Check @Valid @RequestBody AddManagerReq req){
        groupContactService.addManager(req);
        return ApiResult.success();
    }

    @PutMapping("/withdraw-manager")
    @Operation(summary = "撤销管理员")
    public ApiResult<Void> withdrawManager(@Check @Valid @RequestBody WithdrawManagerReq req){
        groupContactService.withdrawManager(req);
        return ApiResult.success();
    }

    @GetMapping("/detail")
    @Operation(summary = "群组详情")
    public ApiResult<Void> detail(){
        return ApiResult.success();
    }

    @GetMapping("/member-detail")
    @Operation(summary = "群成员列表")
    public ApiResult<Void> memberDetail(){
        return ApiResult.success();
    }

    @GetMapping("/search-group")
    @Operation(summary = "查询群组")
    public ApiResult<Void> searchGroup(){
        return ApiResult.success();
    }
}
