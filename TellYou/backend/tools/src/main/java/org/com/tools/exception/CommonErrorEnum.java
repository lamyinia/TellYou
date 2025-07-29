package org.com.tools.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum CommonErrorEnum implements ErrorEnum {

    SYSTEM_ERROR(-1, "SYSTEM ERROR，PLEASE RETRY AGAIN"),
    PARAM_VALID(-2, "VALIDATION ERROR"),
    FREQUENCY_LIMIT(-3, "ERROR FOR FREQUENT REQUEST"),
    LOCK_LIMIT(-4, "ERROR FOR FREQUENT REQUEST");

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
