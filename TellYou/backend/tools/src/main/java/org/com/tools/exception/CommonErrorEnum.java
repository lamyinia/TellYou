package org.com.tools.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CommonErrorEnum implements ErrorEnum {

    SYSTEM_ERROR(-1, "系统，请稍后再试试"),
    PARAM_VALID(-2, "参数校验错误"),
    FLOW_LIMIT(-3, "发送太频繁，你被限流了"),
    LOCK_LIMIT(-4, "操作繁忙，请稍后再试试"),
    UNIFY_ERROR(-5, "绕过前端请求 Api，制裁你"),
    ROLE_ERROR(-6, "群聊角色验证错误"),
    MEMBER_LIMIT(-7, "群成员已满"),
    GROUP_API_ERROR(-8, "群聊接口请求错误"),
    BACKPACK_OWNER_ERROR(-9, "未指定群主"),
    KICK_OUT_ERROR(-10, "踢出群聊失败");

    private final Integer code;
    private final String msg;

    @Override
    public Integer getErrorCode() {
        return this.code;
    }

    @Override
    public String getErrorMsg() {
        return this.msg;
    }
}
