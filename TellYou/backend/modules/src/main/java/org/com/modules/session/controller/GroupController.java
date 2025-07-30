package org.com.modules.session.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.common.ApiResult;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "群组管理接口")
@RestController("groupController")
@RequestMapping("/group")
@RequiredArgsConstructor
public class GroupController {

    @PostMapping("/createGroup")
    @Operation(summary = "创建群聊")
    public ApiResult<Void> createGroup(){
        return ApiResult.success();
    }

    @PostMapping("/invite")
    @Operation(summary = "邀请好友")
    public ApiResult<Void> invite(){
        return ApiResult.success();
    }

    @DeleteMapping("/dissolveGroup")
    @Operation(summary = "解散群聊")
    public ApiResult<Void> dissolveGroup(){
        return ApiResult.success();
    }

    @DeleteMapping("/leaveGroup")
    @Operation(summary = "退群")
    public ApiResult<Void> leaveGroup(){
        return ApiResult.success();
    }

    @DeleteMapping("/kickOut")
    @Operation(summary = "踢出群聊")
    public ApiResult<Void> kickOut(){
        return ApiResult.success();
    }

    @PutMapping("/modifyName")
    @Operation(summary = "修改群名称")
    public ApiResult<Void> modifyName(){
        return ApiResult.success();
    }

    @PutMapping("/modifyNotification")
    @Operation(summary = "修改群公告")
    public ApiResult<Void> modifyNotification(){
        return ApiResult.success();
    }

    @PutMapping("/modifyDescription")
    @Operation(summary = "修改群描述")
    public ApiResult<Void> modifyDescription(){
        return ApiResult.success();
    }

    /**
     * 设置禁言后，只有群主和管理员可以发言
     * @return {@link ApiResult }<{@link Void }>
     */
    @PutMapping("/banChat")
    @Operation(summary = "禁言开关")
    public ApiResult<Void> banChat(){
        return ApiResult.success();
    }

    @PutMapping("/assignOwner")
    @Operation(summary = "指定群主")
    public ApiResult<Void> assignOwner(){
        return ApiResult.success();
    }

    @PutMapping("/addManager")
    @Operation(summary = "添加管理员")
    public ApiResult<Void> addManager(){
        return ApiResult.success();
    }

    @PutMapping("/withdrawManager")
    @Operation(summary = "撤销管理员")
    public ApiResult<Void> withdrawManager(){
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
