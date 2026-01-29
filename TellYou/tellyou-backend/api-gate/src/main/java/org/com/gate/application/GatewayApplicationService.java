package org.com.gate.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.auth.AuthenticationException;
import org.com.gate.domain.auth.AuthenticationResult;
import org.com.gate.domain.auth.AuthenticationService;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.response.GatewayResponseDTO;
import org.com.gate.domain.route.Route;
import org.com.gate.domain.route.RouteMatcher;
import org.com.gate.domain.route.RouteNotFoundException;
import org.com.gate.infrastructure.adapter.HttpToGrpcAdapter;
import org.com.gate.infrastructure.adapter.GrpcResponse;
import org.springframework.stereotype.Service;

/**
 * 网关应用服务（编排业务流程）
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GatewayApplicationService {

    private final RouteMatcher routeMatcher;
    private final AuthenticationService authenticationService;
    private final HttpToGrpcAdapter httpToGrpcAdapter;

    /**
     * 处理网关请求
     */
    public GatewayResponseDTO process(GatewayRequest request) {
        log.info("处理网关请求: {} {}", request.getMethod(), request.getPath());

        Route route = routeMatcher.match(request.getPath(), request.getMethod())
            .orElseThrow(() -> new RouteNotFoundException("未找到匹配的路由: " + request.getPath()));

        Long userID = null;
        if (route.requiresAuth()) {
            String token = request.extractToken();
            if (token == null) {
                throw new AuthenticationException("缺少认证Token");
            }
            AuthenticationResult authResult = authenticationService.authenticate(token);
            if (!authResult.isValid()) {
                throw new AuthenticationException(authResult.getErrorMessage());
            }
            userID = authResult.getUserID();
        }

        GrpcResponse grpcResponse = httpToGrpcAdapter.invoke(route, request, userID);
        return GatewayResponseDTO.from(grpcResponse);
    }
}
