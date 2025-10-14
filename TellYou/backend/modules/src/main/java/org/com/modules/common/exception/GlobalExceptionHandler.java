package org.com.modules.common.exception;

import lombok.extern.slf4j.Slf4j;
import org.com.modules.common.domain.vo.resp.ApiResult;
import org.com.tools.exception.BusinessException;
import org.com.tools.exception.CommonErrorEnum;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    /**
     * 未知异常
     */
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    @ExceptionHandler(value = Exception.class)
    public ApiResult systemExceptionHandler(Exception e) {
        log.error("SYSTEM EXCEPTION! THE REASON IS: {}", e.getMessage(), e);
        return ApiResult.fail(CommonErrorEnum.SYSTEM_ERROR);
    }

    /**
     * 自定义校验异常
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = BusinessException.class)
    public ApiResult businessExceptionHandler(BusinessException e) {
        log.warn("BUSINESS EXCEPTION! THE REASON IS: {}", e.getMessage());
        return ApiResult.fail(e.getErrorCode(), e.getMessage());
    }

    /**
     * 拦截被 seata 包装的异常
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = RuntimeException.class)
    public ApiResult runtimeExceptionHandler(RuntimeException e) {
        log.warn("RUNTIME EXCEPTION! THE REASON IS: {}", e.getMessage());
        if (e.getCause() instanceof BusinessException) {
            BusinessException be = (BusinessException) e.getCause();
            return ApiResult.fail(be.getErrorCode(), be.getMessage());
        }
        return ApiResult.fail(CommonErrorEnum.SYSTEM_ERROR);
    }

    /**
     * validation参数校验异常
     */
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = {MethodArgumentNotValidException.class, BindException.class})
    public ApiResult methodArgumentNotValidExceptionExceptionHandler(MethodArgumentNotValidException e) {
        StringBuilder errorMsg = new StringBuilder();
        e.getBindingResult().getFieldErrors().forEach(x -> errorMsg.append(x.getField()).append(x.getDefaultMessage()).append(","));
        String message = errorMsg.toString();
        log.warn("VALIDATION PARAMETERS ERROR! THE REASON IS: {}", message);
        return ApiResult.fail(CommonErrorEnum.PARAM_VALID.getErrorCode(), message.substring(0, message.length() - 1));
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = CheckPowerException.class)
    public ApiResult checkPowerExceptionHandler(CheckPowerException e) {
        return ApiResult.fail(e);
    }

    @ResponseStatus(HttpStatus.BAD_REQUEST)
    @ExceptionHandler(value = FlowControlException.class)
    public ApiResult FlowControlExceptionHandler(FlowControlException e) {
        return ApiResult.fail(e);
    }
}
