package org.com.gate.infrastructure.adapter.invoker;

import io.grpc.Deadline;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.infrastructure.adapter.GrpcResponse;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.apply.v1.AcceptFriendApplyRequest;
import org.com.shared.proto.social.apply.v1.AcceptFriendApplyResponse;
import org.com.shared.proto.social.apply.v1.ApplyServiceGrpc;
import org.com.shared.proto.social.apply.v1.CursorPullIncomingAppliesRequest;
import org.com.shared.proto.social.apply.v1.CursorPullIncomingAppliesResponse;
import org.com.shared.proto.social.apply.v1.CursorPullOutgoingAppliesRequest;
import org.com.shared.proto.social.apply.v1.CursorPullOutgoingAppliesResponse;
import org.com.shared.proto.social.apply.v1.SendFriendApplyRequest;
import org.com.shared.proto.social.apply.v1.SendFriendApplyResponse;
import org.com.shared.proto.social.common.v1.CursorPageRequest;
import org.com.shared.proto.social.directory.v1.ContactEntry;
import org.com.shared.proto.social.directory.v1.CursorPageContactsRequest;
import org.com.shared.proto.social.directory.v1.CursorPageContactsResponse;
import org.com.shared.proto.social.directory.v1.DirectoryServiceGrpc;
import org.com.shared.proto.social.directory.v1.PullContactsRequest;
import org.com.shared.proto.social.directory.v1.PullContactsResponse;
import org.com.shared.proto.social.group.v1.CreateGroupRequest;
import org.com.shared.proto.social.group.v1.CreateGroupResponse;
import org.com.shared.proto.social.group.v1.GetBaseInfoListRequest;
import org.com.shared.proto.social.group.v1.GetBaseInfoListResponse;
import org.com.shared.proto.social.group.v1.GroupInfo;
import org.com.shared.proto.social.group.v1.GroupMemberInfo;
import org.com.shared.proto.social.group.v1.GroupServiceGrpc;
import org.com.shared.proto.social.group.v1.PageMemberInfoListRequest;
import org.com.shared.proto.social.group.v1.PageMemberInfoListResponse;
import org.com.shared.proto.social.group.v1.PageRequest;
import org.com.shared.proto.social.relation.v1.DeleteFriendRequest;
import org.com.shared.proto.social.relation.v1.DeleteFriendResponse;
import org.com.shared.proto.social.relation.v1.RelationServiceGrpc;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
public class SocialServiceInvoker implements ServiceInvoker {

    private final GrpcClientFactory grpcClientFactory;
    private final long defaultTimeoutMs;
    private final long socialServiceTimeoutMs;

    public SocialServiceInvoker(GrpcClientFactory grpcClientFactory, long defaultTimeoutMs, long socialServiceTimeoutMs) {
        this.grpcClientFactory = grpcClientFactory;
        this.defaultTimeoutMs = defaultTimeoutMs;
        this.socialServiceTimeoutMs = socialServiceTimeoutMs;
    }

    private GrpcResponse cursorPageContacts(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            DirectoryServiceGrpc.DirectoryServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> DirectoryServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            int pageSize = asInt(firstNonNull(request.getParameters().get("pageSize"), request.getParameters().get("page_size")));
            if (pageSize <= 0) {
                pageSize = 100;
            }
            String cursor = asString(request.getParameters().get("cursor"));

            CursorPageContactsResponse resp = stub.cursorPageContacts(CursorPageContactsRequest.newBuilder()
                .setUserId(uid)
                .setPage(CursorPageRequest.newBuilder().setPageSize(pageSize).setCursor(cursor).build())
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("cursor", resp.getCursor());
            data.put("isLast", resp.getIsLast());
            data.put("contactIds", resp.getContactIdsList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "cursorPageContacts", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "cursorPageContacts", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse cursorPullIncomingApplies(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            ApplyServiceGrpc.ApplyServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> ApplyServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            int pageSize = asInt(firstNonNull(request.getParameters().get("pageSize"), request.getParameters().get("page_size")));
            if (pageSize <= 0) {
                pageSize = 100;
            }
            String cursor = asString(request.getParameters().get("cursor"));

            CursorPullIncomingAppliesResponse resp = stub.cursorPullIncomingApplies(CursorPullIncomingAppliesRequest.newBuilder()
                .setUserId(uid)
                .setPage(CursorPageRequest.newBuilder().setPageSize(pageSize).setCursor(cursor).build())
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("cursor", resp.getCursor());
            data.put("isLast", resp.getIsLast());
            data.put("list", resp.getListList().stream().map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("applyId", a.getApplyId());
                m.put("applyUserId", a.getApplyUserId());
                m.put("targetId", a.getTargetId());
                m.put("acceptorId", a.getAcceptorId());
                m.put("contactType", a.getContactTypeValue());
                m.put("lastApplyTimeMs", a.getLastApplyTimeMs());
                m.put("status", a.getStatus());
                m.put("applyInfo", a.getApplyInfo());
                return m;
            }).toList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "cursorPullIncomingApplies", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "cursorPullIncomingApplies", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse cursorPullOutgoingApplies(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            ApplyServiceGrpc.ApplyServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> ApplyServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            int pageSize = asInt(firstNonNull(request.getParameters().get("pageSize"), request.getParameters().get("page_size")));
            if (pageSize <= 0) {
                pageSize = 100;
            }
            String cursor = asString(request.getParameters().get("cursor"));

            CursorPullOutgoingAppliesResponse resp = stub.cursorPullOutgoingApplies(CursorPullOutgoingAppliesRequest.newBuilder()
                .setUserId(uid)
                .setPage(CursorPageRequest.newBuilder().setPageSize(pageSize).setCursor(cursor).build())
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("cursor", resp.getCursor());
            data.put("isLast", resp.getIsLast());
            data.put("list", resp.getListList().stream().map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("applyId", a.getApplyId());
                m.put("applyUserId", a.getApplyUserId());
                m.put("targetId", a.getTargetId());
                m.put("acceptorId", a.getAcceptorId());
                m.put("contactType", a.getContactTypeValue());
                m.put("lastApplyTimeMs", a.getLastApplyTimeMs());
                m.put("status", a.getStatus());
                m.put("applyInfo", a.getApplyInfo());
                return m;
            }).toList());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "cursorPullOutgoingApplies", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "cursorPullOutgoingApplies", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse sendFriendApply(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            ApplyServiceGrpc.ApplyServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> ApplyServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long fromUserId = requireUserId(userId, request);
            long contactId = asLong(firstNonNull(request.getParameters().get("contactId"), request.getParameters().get("contact_id")));
            String description = asString(firstNonNull(request.getParameters().get("description"), request.getParameters().get("desc")));

            SendFriendApplyResponse resp = stub.sendFriendApply(SendFriendApplyRequest.newBuilder()
                .setFromUserId(fromUserId)
                .setContactId(contactId)
                .setDescription(description)
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("accepted", resp.getAccepted());
            data.put("reason", resp.getReason());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "sendFriendApply", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "sendFriendApply", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse acceptFriendApply(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            ApplyServiceGrpc.ApplyServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> ApplyServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long fromUserId = requireUserId(userId, request);
            long applyId = asLong(firstNonNull(request.getParameters().get("applyId"), request.getParameters().get("apply_id")));

            AcceptFriendApplyResponse resp = stub.acceptFriendApply(AcceptFriendApplyRequest.newBuilder()
                .setFromUserId(fromUserId)
                .setApplyId(applyId)
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("accepted", resp.getAccepted());
            data.put("reason", resp.getReason());
            data.put("sessionId", resp.getSessionId());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "acceptFriendApply", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "acceptFriendApply", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse deleteFriend(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            RelationServiceGrpc.RelationServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> RelationServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            long contactId = asLong(firstNonNull(request.getParameters().get("contactId"), request.getParameters().get("contact_id")));

            DeleteFriendResponse resp = stub.deleteFriend(DeleteFriendRequest.newBuilder()
                .setUserId(uid)
                .setContactId(contactId)
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("deleted", resp.getDeleted());
            data.put("reason", resp.getReason());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "deleteFriend", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "deleteFriend", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    @Override
    public GrpcResponse invoke(Route route, GatewayRequest request, Long userId) {
        String methodName = extractMethodName(request.getPath());

        if ("createGroup".equalsIgnoreCase(methodName)) {
            return createGroup(request, userId);
        }
        if ("getBaseInfoList".equalsIgnoreCase(methodName)) {
            return getBaseInfoList(request);
        }
        if ("pullContacts".equalsIgnoreCase(methodName)) {
            return pullContacts(request, userId);
        }
        if ("cursorPageContacts".equalsIgnoreCase(methodName)) {
            return cursorPageContacts(request, userId);
        }
        if ("pageMemberInfoList".equalsIgnoreCase(methodName)) {
            return pageMemberInfoList(request, userId);
        }

        if ("cursorPullIncomingApplies".equalsIgnoreCase(methodName)) {
            return cursorPullIncomingApplies(request, userId);
        }
        if ("cursorPullOutgoingApplies".equalsIgnoreCase(methodName)) {
            return cursorPullOutgoingApplies(request, userId);
        }
        if ("sendFriendApply".equalsIgnoreCase(methodName)) {
            return sendFriendApply(request, userId);
        }
        if ("acceptFriendApply".equalsIgnoreCase(methodName)) {
            return acceptFriendApply(request, userId);
        }
        if ("deleteFriend".equalsIgnoreCase(methodName)) {
            return deleteFriend(request, userId);
        }

        return GrpcResponse.error("social-service 不支持的方法: " + methodName);
    }

    private GrpcResponse createGroup(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            GroupServiceGrpc.GroupServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> GroupServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long fromUserId = requireUserId(userId, request);
            String name = asString(firstNonNull(request.getParameters().get("name"), request.getParameters().get("groupName")));

            CreateGroupResponse resp = stub.createGroup(CreateGroupRequest.newBuilder()
                .setFromUserId(fromUserId)
                .setName(name)
                .build());

            Map<String, Object> data = new HashMap<>();
            data.put("created", resp.getCreated());
            data.put("reason", resp.getReason());
            data.put("groupId", resp.getGroupId());
            data.put("sessionId", resp.getSessionId());
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "createGroup", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "createGroup", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse getBaseInfoList(GatewayRequest request) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            GroupServiceGrpc.GroupServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> GroupServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            List<Long> groupIds = asLongList(firstNonNull(request.getParameters().get("groupIds"), request.getParameters().get("group_ids")));
            GetBaseInfoListResponse resp = stub.getBaseInfoList(GetBaseInfoListRequest.newBuilder()
                .addAllGroupIds(groupIds)
                .build());

            List<Map<String, Object>> list = new ArrayList<>();
            for (GroupInfo gi : resp.getGroupInfoListList()) {
                Map<String, Object> m = new HashMap<>();
                m.put("groupId", gi.getGroupId());
                m.put("groupName", gi.getGroupName());
                m.put("avatar", gi.getAvatar());
                list.add(m);
            }

            Map<String, Object> data = new HashMap<>();
            data.put("groupInfoList", list);
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "getBaseInfoList", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "getBaseInfoList", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse pullContacts(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            DirectoryServiceGrpc.DirectoryServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> DirectoryServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long uid = requireUserId(userId, request);
            PullContactsResponse resp = stub.pullContacts(PullContactsRequest.newBuilder().setUserId(uid).build());

            List<Map<String, Object>> list = new ArrayList<>();
            resp.getContactsList().forEach((ContactEntry c) -> {
                Map<String, Object> m = new HashMap<>();
                m.put("sessionId", c.getSessionId());
                m.put("contactId", c.getContactId());
                m.put("role", c.getRole());
                m.put("contactType", c.getContactTypeValue());
                list.add(m);
            });

            Map<String, Object> data = new HashMap<>();
            data.put("contacts", list);
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "pullContacts", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "pullContacts", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private GrpcResponse pageMemberInfoList(GatewayRequest request, Long userId) {
        String service = "social-service";
        long timeoutMs = getTimeoutForService(service);

        try {
            GroupServiceGrpc.GroupServiceBlockingStub stub = grpcClientFactory.createStub(
                service,
                channel -> GroupServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(timeoutMs, TimeUnit.MILLISECONDS))
            );

            long fromUserId = requireUserId(userId, request);
            long groupId = asLong(firstNonNull(request.getParameters().get("groupId"), request.getParameters().get("group_id")));
            int pageNo = asInt(firstNonNull(request.getParameters().get("pageNo"), request.getParameters().get("page_no")));
            int pageSize = asInt(firstNonNull(request.getParameters().get("pageSize"), request.getParameters().get("page_size")));
            if (pageNo <= 0) {
                pageNo = 1;
            }
            if (pageSize <= 0) {
                pageSize = 20;
            }

            PageMemberInfoListResponse resp = stub.pageMemberInfoList(PageMemberInfoListRequest.newBuilder()
                .setFromUserId(fromUserId)
                .setGroupId(groupId)
                .setPage(PageRequest.newBuilder().setPageNo(pageNo).setPageSize(pageSize).build())
                .build());

            List<Map<String, Object>> list = new ArrayList<>();
            for (GroupMemberInfo mi : resp.getListList()) {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", mi.getUserId());
                m.put("role", mi.getRole());
                list.add(m);
            }

            Map<String, Object> data = new HashMap<>();
            data.put("pageNo", resp.getPageNo());
            data.put("pageSize", resp.getPageSize());
            data.put("totalRecords", resp.getTotalRecords());
            data.put("isLast", resp.getIsLast());
            data.put("list", list);
            return GrpcResponse.success(data);
        } catch (StatusRuntimeException e) {
            return mapGrpcError(service, "pageMemberInfoList", timeoutMs, e);
        } catch (Exception e) {
            log.error("调用{}异常: method={}", service, "pageMemberInfoList", e);
            return GrpcResponse.error("调用" + service + "失败: " + e.getMessage());
        }
    }

    private long getTimeoutForService(String serviceName) {
        return switch (serviceName) {
            case "social-service" -> socialServiceTimeoutMs;
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

    private static long requireUserId(Long userId, GatewayRequest request) {
        if (userId != null && userId > 0) {
            return userId;
        }
        Object from = firstNonNull(request.getParameters().get("userId"), request.getParameters().get("user_id"));
        from = firstNonNull(from, firstNonNull(request.getParameters().get("fromUserId"), request.getParameters().get("from_user_id")));
        long uid = asLong(from);
        if (uid <= 0) {
            throw new IllegalArgumentException("缺少 userId");
        }
        return uid;
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

    private static List<Long> asLongList(Object v) {
        if (v == null) {
            return List.of();
        }
        if (v instanceof List<?> list) {
            List<Long> out = new ArrayList<>(list.size());
            for (Object o : list) {
                long id = asLong(o);
                if (id > 0) {
                    out.add(id);
                }
            }
            return out;
        }
        String s = String.valueOf(v);
        if (s.isBlank()) {
            return List.of();
        }
        String[] parts = s.split(",");
        List<Long> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            long id = asLong(p.trim());
            if (id > 0) {
                out.add(id);
            }
        }
        return out;
    }

    private String extractMethodName(String path) {
        String[] parts = path.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : "index";
    }
}
