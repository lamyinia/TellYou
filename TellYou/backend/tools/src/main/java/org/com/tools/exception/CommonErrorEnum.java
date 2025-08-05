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
    UNIFY_ERROR(-5, "绕过前端请求 Api，制裁你");

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
