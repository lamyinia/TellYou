package org.com.modules.global.exception;

import lombok.extern.slf4j.Slf4j;
import org.com.tools.common.ApiResult;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常捕获
 *
 * @author lanye
 * @date 2025/06/21
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ExceptionHandler(value = Exception.class)
    public ApiResult systemExceptionHandler(Exception e) {
        log.error("SYSTEM EXCEPTION！THE REASON IS: {}", e.getMessage(), e);
        return ApiResult.fail(CommonErrorEnum.SYSTEM_ERROR);
    }

    /**
     * 自定义校验异常
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = BusinessException.class)
    public ApiResult businessExceptionHandler(BusinessException e) {
        log.info("BUSINESS EXCEPTION！THE REASON IS: {}", e.getMessage(), e);
        return ApiResult.fail(e.getErrorCode(), e.getMessage());
    }
}
