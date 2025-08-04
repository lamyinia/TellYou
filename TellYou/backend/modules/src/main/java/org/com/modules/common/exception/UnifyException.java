package org.com.modules.common.exception;

import lombok.Data;
import org.com.tools.exception.ErrorEnum;

@Data
public class UnifyException extends RuntimeException implements ErrorEnum{

    private static final long serialVersionUID = 1L;

    /**
     *  错误码
     */
    protected Integer errorCode;

    /**
     *  错误信息
     */
    protected String errorMsg;

    public UnifyException() {
        super();
    }

    public UnifyException(String errorMsg) {
        super(errorMsg);
        this.errorMsg = errorMsg;
    }

    public UnifyException(ErrorEnum error) {
        super(error.getErrorMsg());
        this.errorCode = error.getErrorCode();
        this.errorMsg = error.getErrorMsg();
    }
}
