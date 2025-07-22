package org.com.modules.global;

import lombok.extern.slf4j.Slf4j;
import org.com.tools.common.ApiResult;
import org.com.tools.common.exception.CommonErrorEnum;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

/**
 * 全局异常捕获
 * @author lanye
 * @date 2025/06/21
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ExceptionHandler(value = {Exception.class, NoHandlerFoundException.class})
    public ApiResult systemExceptionHandler(Exception e) {
        throw new RuntimeException(e);
//        log.error("SYSTEM EXCEPTION! THE REASON IS: {}", e.getMessage(), e);
//        return ApiResult.fail(CommonErrorEnum.SYSTEM_ERROR);
    }

}
