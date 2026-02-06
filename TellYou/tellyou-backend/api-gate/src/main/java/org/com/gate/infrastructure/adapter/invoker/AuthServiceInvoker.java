package org.com.gate.infrastructure.adapter.invoker;

import io.grpc.Deadline;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.infrastructure.adapter.GrpcResponse;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.auth.v1.AuthServiceGrpc;
import org.com.shared.proto.auth.v1.LoginRequest;
import org.com.shared.proto.auth.v1.LoginResponse;
import org.com.shared.proto.auth.v1.RegisterRequest;
import org.com.shared.proto.auth.v1.RegisterResponse;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
public class AuthServiceInvoker implements ServiceInvoker {

    private final GrpcClientFactory grpcClientFactory;
    private final long defaultTimeoutMs;
    private final long authServiceTimeoutMs;

    public AuthServiceInvoker(GrpcClientFactory grpcClientFactory, long defaultTimeoutMs, long authServiceTimeoutMs) {
        this.grpcClientFactory = grpcClientFactory;
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.authServiceTimeoutMs = authServiceTimeoutMs;
    }

    @Override
    public GrpcResponse invoke(Route route, GatewayRequest request, Long userId) {
        String methodName = extractMethodName(request.getPath());

        if ("login".equalsIgnoreCase(methodName)) {
            return login(request);
        }
        if ("register".equalsIgnoreCase(methodName)) {
            return register(request);
        }

        return GrpcResponse.error("auth-service 不支持的方法: " + methodName);
    }

    private GrpcResponse login(GatewayRequest request) {
        String service = "auth-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            AuthServiceGrpc.AuthServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> AuthServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

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
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "login", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "login", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse register(GatewayRequest request) {
        String service = "auth-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            AuthServiceGrpc.AuthServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> AuthServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

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
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "register", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "register", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private long getTimeoutForService(String serviceName) {
        return switch (serviceName) {
            case "auth-service" -> authServiceTimeoutMs;
            default -> defaultTimeoutMs;
        };
    }

    private GrpcResponse mapGrpcError(String serviceName, String methodName, long timeoutMs, StatusRuntimeException e) {
        Status status = e.getStatus();
        if (status.getCode() == Status.Code.DEADLINE_EXCEEDED) {
            log.warn("调用{}超时: method={}, timeout={}ms", serviceName, methodName, timeoutMs);
            return GrpcResponse.error(504, "服务调用超时，请稍后重试");
        }
        if (status.getCode() == Status.Code.UNAVAILABLE) {
            log.error("{}不可用: method={}", serviceName, methodName, e);
            return GrpcResponse.error(503, "服务暂时不可用，请稍后重试");
        }

        log.error("调用{}失败: method={}, status={}", serviceName, methodName, status, e);
        return GrpcResponse.error("服务调用失败: " + status.getDescription());
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
