package org.com.gate.infrastructure.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.domain.route.ServiceName;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HTTP到gRPC适配器
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class HttpToGrpcAdapter {
    
    private final GrpcClientFactory grpcClientFactory;
    private final Map<ServiceName, ServiceInvoker> invokers = new ConcurrentHashMap<>();
    
    @Value("${grpc.timeout.default:5000}")
    private long defaultTimeoutMs;
    
    @Value("${grpc.timeout.auth-service:${grpc.timeout.default}}")
    private long authServiceTimeoutMs;
    
    @Value("${grpc.timeout.social-service:${grpc.timeout.default}}")
    private long socialServiceTimeoutMs;
    
    /**
     * 调用后端服务
     */
    public GrpcResponse invoke(Route route, GatewayRequest request, Long userId) {
        ServiceName serviceName = route.getTargetService();
        ServiceInvoker invoker = invokers.computeIfAbsent(serviceName, this::createInvoker);
        
        return invoker.invoke(route, request, userId);
    }
    
    private ServiceInvoker createInvoker(ServiceName serviceName) {
        // 根据服务名创建对应的调用器
        // 传递超时配置参数
        return new DefaultServiceInvoker(
            serviceName, 
            grpcClientFactory,
            defaultTimeoutMs,
            authServiceTimeoutMs,
            socialServiceTimeoutMs
        );
    }
}
