package org.com.tools.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @author lanye
 * @date 2025/07/23
 */
@AllArgsConstructor
@Getter
public enum BusinessErrorEnum implements ErrorEnum {
    BUSINESS_ERROR(1001, "BUSINESS ERROR"),
    SYSTEM_ERROR(1001, "SYSTEM ERROR");
    private Integer code;
    private String msg;

    @Override
    public Integer getErrorCode() {
        return code;
    }

    @Override
    public String getErrorMsg() {
        return msg;
    }
}

