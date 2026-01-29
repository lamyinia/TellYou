package org.com.gate.infrastructure.adapter;

import io.grpc.Deadline;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.domain.route.ServiceName;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.auth.v1.AuthServiceGrpc;
import org.com.shared.proto.auth.v1.LoginRequest;
import org.com.shared.proto.auth.v1.LoginResponse;
import org.com.shared.proto.auth.v1.RegisterRequest;
import org.com.shared.proto.auth.v1.RegisterResponse;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 默认服务调用器
 * 注意：这里需要根据实际的Protobuf定义来实现具体调用
 */
@Slf4j
public class DefaultServiceInvoker implements ServiceInvoker {

    private final ServiceName serviceName;
    private final GrpcClientFactory grpcClientFactory;
    private final long defaultTimeoutMs;
    private final long authServiceTimeoutMs;
    private final long socialServiceTimeoutMs;
    
    /**
     * 构造函数（用于手动创建，不依赖 Spring）
     */
    public DefaultServiceInvoker(ServiceName serviceName, GrpcClientFactory grpcClientFactory, 
                                 long defaultTimeoutMs, long authServiceTimeoutMs, long socialServiceTimeoutMs) {
        this.serviceName = serviceName;
        this.grpcClientFactory = grpcClientFactory;
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.authServiceTimeoutMs = authServiceTimeoutMs;
        this.socialServiceTimeoutMs = socialServiceTimeoutMs;
    }

    @Override
    public GrpcResponse invoke(Route route, GatewayRequest request, Long userId) {
        String methodName = extractMethodName(request.getPath());

        log.info("调用gRPC服务: {} -> {}", serviceName.getValue(), methodName);

        if ("auth-service".equals(serviceName.getValue())) {
            return invokeAuthService(methodName, request);
        }

        return GrpcResponse.error("服务调用未实现: " + serviceName.getValue() + "." + methodName);
    }

    private GrpcResponse invokeAuthService(String methodName, GatewayRequest request) {
        try {
            // 创建带超时的 stub
            AuthServiceGrpc.AuthServiceBlockingStub stub = grpcClientFactory.createStub(
                serviceName.getValue(),
                channel -> AuthServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(authServiceTimeoutMs, TimeUnit.MILLISECONDS))
            );

            if ("login".equalsIgnoreCase(methodName)) {
                String email = asString(request.getParameters().get("email"));
                String password = asString(request.getParameters().get("password"));

                LoginResponse resp = stub.login(LoginRequest.newBuilder()
                    .setEmail(email)
                    .setPassword(password)
                    .build());

                Map<String, Object> data = new HashMap<>();
                data.put("userId", resp.getUserId());
                data.put("token", resp.getToken());
                return GrpcResponse.success(data);
            }

            if ("register".equalsIgnoreCase(methodName)) {
                String email = asString(request.getParameters().get("email"));
                String password = asString(request.getParameters().get("password"));
                String nickName = asString(firstNonNull(request.getParameters().get("nickName"), request.getParameters().get("nickname")));
                int sex = asInt(request.getParameters().get("sex"));

                RegisterResponse resp = stub.register(RegisterRequest.newBuilder()
                    .setEmail(email)
                    .setPassword(password)
                    .setNickName(nickName)
                    .setSex(sex)
                    .build());

                Map<String, Object> data = new HashMap<>();
                data.put("userId", resp.getUserId());
                data.put("token", resp.getToken());
                return GrpcResponse.success(data);
            }

            return GrpcResponse.error("auth-service 不支持的方法: " + methodName);
        } catch (StatusRuntimeException e) {
            // 处理 gRPC 异常（包括超时）
            Status status = e.getStatus();
            if (status.getCode() == Status.Code.DEADLINE_EXCEEDED) {
                log.warn("调用auth-service超时: method={}, timeout={}ms", methodName, authServiceTimeoutMs);
                return GrpcResponse.error("服务调用超时，请稍后重试");
            } else if (status.getCode() == Status.Code.UNAVAILABLE) {
                log.error("auth-service不可用: method={}", methodName, e);
                return GrpcResponse.error("服务暂时不可用，请稍后重试");
            } else {
                log.error("调用auth-service失败: method={}, status={}", methodName, status, e);
                return GrpcResponse.error("服务调用失败: " + status.getDescription());
            }
        } catch (Exception e) {
            log.error("调用auth-service异常: method={}", methodName, e);
            return GrpcResponse.error("调用auth-service失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取指定服务的超时时间（毫秒）
     */
    private long getTimeoutForService(String serviceName) {
        return switch (serviceName) {
            case "auth-service" -> authServiceTimeoutMs;
            case "social-service" -> socialServiceTimeoutMs;
            default -> defaultTimeoutMs;
        };
    }

    private static Object firstNonNull(Object a, Object b) {
        return a != null ? a : b;
    }

    private static String asString(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static int asInt(Object v) {
        if (v == null) {
            return 0;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String extractMethodName(String path) {
        String[] parts = path.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : "index";
    }
}
