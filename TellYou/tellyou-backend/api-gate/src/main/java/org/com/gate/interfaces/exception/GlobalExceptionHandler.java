package org.com.gate.interfaces.exception;

import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.auth.AuthenticationException;
import org.com.gate.domain.response.GatewayResponseDTO;
import org.com.gate.domain.route.RouteNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(RouteNotFoundException.class)
    public GatewayResponseDTO handleRouteNotFound(RouteNotFoundException e) {
        log.warn("路由未找到: {}", e.getMessage());
        return GatewayResponseDTO.error(404, e.getMessage());
    }

    @ExceptionHandler(AuthenticationException.class)
    public GatewayResponseDTO handleAuthentication(AuthenticationException e) {
        log.warn("认证失败: {}", e.getMessage());
        return GatewayResponseDTO.error(401, e.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public GatewayResponseDTO handleIllegalArgument(IllegalArgumentException e) {
        log.warn("参数错误: {}", e.getMessage());
        return GatewayResponseDTO.error(400, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public GatewayResponseDTO handleException(Exception e) {
        log.error("网关处理失败", e);
        return GatewayResponseDTO.error(500, "服务器内部错误: " + e.getMessage());
    }
}
