package org.com.gate.infrastructure.adapter.invoker;

import io.grpc.Deadline;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.infrastructure.adapter.GrpcResponse;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.message.pull.v1.*;
import org.com.shared.proto.social.common.v1.CursorPageRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
public class MessagePullServiceInvoker implements ServiceInvoker {

    private final GrpcClientFactory grpcClientFactory;
    private final long defaultTimeoutMs;
    private final long messagePullServiceTimeoutMs;

    public MessagePullServiceInvoker(GrpcClientFactory grpcClientFactory, long defaultTimeoutMs, long messagePullServiceTimeoutMs) {
        this.grpcClientFactory = grpcClientFactory;
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.messagePullServiceTimeoutMs = messagePullServiceTimeoutMs;
    }

    @Override
    public GrpcResponse invoke(Route route, GatewayRequest request, Long userId) {
        String methodName = extractMethodName(request.getPath());

        if ("pullWriteFanoutOfflineByUser".equalsIgnoreCase(methodName)) {
            return pullWriteFanoutOfflineByUser(request, userId);
        }
        if ("pullReadFanoutOfflineBySessions".equalsIgnoreCase(methodName)) {
            return pullReadFanoutOfflineBySessions(request, userId);
        }
        if ("ackReadProgress".equalsIgnoreCase(methodName)) {
            return ackReadProgress(request, userId);
        }
        if ("batchGetSyncState".equalsIgnoreCase(methodName)) {
            return batchGetSyncState(request, userId);
        }

        return GrpcResponse.error("message-pull-service 不支持的方法: " + methodName);
    }

    private GrpcResponse pullWriteFanoutOfflineByUser(GatewayRequest request, Long userId) {
        String service = "message-pull-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            MessagePullServiceGrpc.MessagePullServiceBlockingStub stub = grpcClientFactory.createStub(
                    service,
                    channel -> MessagePullServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            int pageSize = asInt(firstNonNull(request.getParameters().get("pageSize"), request.getParameters().get("page_size")));
            if (pageSize <= 0) {
                pageSize = 100;
            }
            String cursor = asString(request.getParameters().get("cursor"));

            PullWriteFanoutOfflineByUserResponse resp = stub.pullWriteFanoutOfflineByUser(
                    PullWriteFanoutOfflineByUserRequest.newBuilder()
                            .setUserId(uid)
                            .setPage(CursorPageRequest.newBuilder()
                                    .setPageSize(pageSize)
                                    .setCursor(cursor)
                                    .build())
                            .build()
            );

            Map<String, Object> data = new HashMap<>();
            data.put("cursor", resp.getCursor());
            data.put("isLast", resp.getIsLast());
            data.put("messages", resp.getMessagesList().stream().map(this::toMessageMap).toList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "pullWriteFanoutOfflineByUser", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "pullWriteFanoutOfflineByUser", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse pullReadFanoutOfflineBySessions(GatewayRequest request, Long userId) {
        String service = "message-pull-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            MessagePullServiceGrpc.MessagePullServiceBlockingStub stub = grpcClientFactory.createStub(
                    service,
                    channel -> MessagePullServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            int limitPerSession = asInt(firstNonNull(request.getParameters().get("limitPerSession"), request.getParameters().get("limit_per_session")));
            if (limitPerSession <= 0) {
                limitPerSession = 100;
            }

            List<SessionCursor> cursors = parseSessionCursors(request.getParameters().get("cursors"));

            PullReadFanoutOfflineBySessionsResponse resp = stub.pullReadFanoutOfflineBySessions(
                    PullReadFanoutOfflineBySessionsRequest.newBuilder()
                            .setUserId(uid)
                            .addAllCursors(cursors)
                            .setLimitPerSession(limitPerSession)
                            .build()
            );

            Map<String, Object> data = new HashMap<>();
            data.put("sessions", resp.getSessionsList().stream().map(s -> {
                Map<String, Object> m = new HashMap<>();
                m.put("sessionId", s.getSessionId());
                m.put("nextAfterSeq", s.getNextAfterSeq());
                m.put("hasMore", s.getHasMore());
                m.put("messages", s.getMessagesList().stream().map(this::toMessageMap).toList());
                return m;
            }).toList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "pullReadFanoutOfflineBySessions", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "pullReadFanoutOfflineBySessions", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse ackReadProgress(GatewayRequest request, Long userId) {
        String service = "message-pull-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            MessagePullServiceGrpc.MessagePullServiceBlockingStub stub = grpcClientFactory.createStub(
                    service,
                    channel -> MessagePullServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            long sessionId = asLong(firstNonNull(request.getParameters().get("sessionId"), request.getParameters().get("session_id")));
            long lastSeq = asLong(firstNonNull(request.getParameters().get("lastSeq"), request.getParameters().get("last_seq")));

            AckReadProgressResponse resp = stub.ackReadProgress(
                    AckReadProgressRequest.newBuilder()
                            .setUserId(uid)
                            .setSessionId(sessionId)
                            .setLastSeq(lastSeq)
                            .build()
            );

            Map<String, Object> data = new HashMap<>();
            data.put("updated", resp.getUpdated());
            data.put("serverLastSeq", resp.getServerLastSeq());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "ackReadProgress", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "ackReadProgress", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse batchGetSyncState(GatewayRequest request, Long userId) {
        String service = "message-pull-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            MessagePullServiceGrpc.MessagePullServiceBlockingStub stub = grpcClientFactory.createStub(
                    service,
                    channel -> MessagePullServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            List<Long> sessionIds = parseLongList(firstNonNull(request.getParameters().get("sessionIds"), request.getParameters().get("session_ids")));

            BatchGetSyncStateResponse resp = stub.batchGetSyncState(
                    BatchGetSyncStateRequest.newBuilder()
                            .setUserId(uid)
                            .addAllSessionIds(sessionIds)
                            .build()
            );

            Map<String, Object> data = new HashMap<>();
            data.put("states", resp.getStatesList().stream().map(s -> {
                Map<String, Object> m = new HashMap<>();
                m.put("sessionId", s.getSessionId());
                m.put("lastSeq", s.getLastSeq());
                m.put("updatedAtMs", s.getUpdatedAtMs());
                return m;
            }).toList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "batchGetSyncState", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "batchGetSyncState", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private long getTimeoutForService(String serviceName) {
        return switch (serviceName) {
            case "message-pull-service" -> messagePullServiceTimeoutMs;
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

    private Map<String, Object> toMessageMap(ChatMessage a) {
        Map<String, Object> m = new HashMap<>();
        m.put("sessionId", a.getSessionId());
        m.put("msgId", a.getMsgId());
        m.put("seq", a.getSeq());
        m.put("senderId", a.getSenderId());
        m.put("partitionId", a.getPartitionId());
        m.put("msgType", a.getMsgType());
        m.put("appearance", a.getAppearance());
        m.put("content", a.getContent());
        m.put("createdAtMs", a.getCreatedAtMs());
        return m;
    }

    private static long requireUserId(Long userId, GatewayRequest request) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("missing_user_id");
        }
        return userId;
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

    private static long asLong(Object v) {
        if (v == null) {
            return 0L;
        }
        if (v instanceof Number n) {
            return n.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(v));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private static List<Long> parseLongList(Object v) {
        if (v == null) {
            return List.of();
        }
        if (v instanceof List<?> list) {
            ArrayList<Long> out = new ArrayList<>(list.size());
            for (Object o : list) {
                long x = asLong(o);
                if (x > 0) {
                    out.add(x);
                }
            }
            return out;
        }

        String s = asString(v);
        if (s.isBlank()) {
            return List.of();
        }
        String[] parts = s.split(",");
        ArrayList<Long> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            try {
                long x = Long.parseLong(p.trim());
                if (x > 0) {
                    out.add(x);
                }
            } catch (Exception ignored) {
            }
        }
        return out;
    }

    private static List<SessionCursor> parseSessionCursors(Object v) {
        if (v == null) {
            return List.of();
        }

        ArrayList<SessionCursor> out = new ArrayList<>();
        if (v instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    long sessionId = asLong(firstNonNull(map.get("sessionId"), map.get("session_id")));
                    long afterSeq = asLong(firstNonNull(map.get("afterSeq"), map.get("after_seq")));
                    if (sessionId > 0) {
                        out.add(SessionCursor.newBuilder().setSessionId(sessionId).setAfterSeq(Math.max(0L, afterSeq)).build());
                    }
                    continue;
                }

                if (item instanceof String s) {
                    SessionCursor c = parseSessionCursorString(s);
                    if (c != null) {
                        out.add(c);
                    }
                }
            }
            return out;
        }

        String s = asString(v);
        if (s.isBlank()) {
            return List.of();
        }

        String[] parts = s.split(",");
        for (String p : parts) {
            SessionCursor c = parseSessionCursorString(p);
            if (c != null) {
                out.add(c);
            }
        }
        return out;
    }

    private static SessionCursor parseSessionCursorString(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        String[] parts = s.trim().split(":");
        if (parts.length != 2) {
            return null;
        }
        try {
            long sessionId = Long.parseLong(parts[0]);
            long afterSeq = Long.parseLong(parts[1]);
            if (sessionId <= 0) {
                return null;
            }
            return SessionCursor.newBuilder().setSessionId(sessionId).setAfterSeq(Math.max(0L, afterSeq)).build();
        } catch (Exception e) {
            return null;
        }
    }

    private String extractMethodName(String path) {
        String[] parts = path.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : "index";
    }
}
