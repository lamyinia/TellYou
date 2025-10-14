package org.com.modules.common.exception;

import lombok.Data;
import org.com.tools.exception.ErrorEnum;

@Data
public class CheckPowerException extends RuntimeException implements ErrorEnum{

    private static final long serialVersionUID = 1L;

    /**
     *  错误码
     */
    protected Integer errorCode;

    /**
     *  错误信息
     */
    protected String errorMsg;

    public CheckPowerException() {
        super();
    }

    public CheckPowerException(String errorMsg) {
        super(errorMsg);
        this.errorMsg = errorMsg;
    }

    public CheckPowerException(ErrorEnum error) {
        super(error.getErrorMsg());
        this.errorCode = error.getErrorCode();
        this.errorMsg = error.getErrorMsg();
    }
}
