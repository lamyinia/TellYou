package org.com.store.infrastructure.grpc;

import io.grpc.Deadline;
import io.grpc.StatusRuntimeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.session.v1.CheckSendPermissionRequest;
import org.com.shared.proto.social.session.v1.CheckSendPermissionResponse;
import org.com.shared.proto.social.session.v1.ListSessionMembersRequest;
import org.com.shared.proto.social.session.v1.ListSessionMembersResponse;
import org.com.shared.proto.social.session.v1.SessionServiceGrpc;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class SocialSessionGrpcClient {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${grpc.timeout.social-service:${grpc.timeout.default:3000}}")
    private long socialServiceTimeoutMs;

    public CheckSendPermissionResponse checkSendPermission(long sessionId, long userId, int partitionId) {
        try {
            SessionServiceGrpc.SessionServiceBlockingStub stub = grpcClientFactory.createStub(
                    "social-service",
                    channel -> SessionServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(socialServiceTimeoutMs, TimeUnit.MILLISECONDS))
            );

            return stub.checkSendPermission(CheckSendPermissionRequest.newBuilder()
                    .setSessionId(sessionId)
                    .setUserId(userId)
                    .setPartitionId(partitionId)
                    .build());
        } catch (StatusRuntimeException e) {
            log.warn("checkSendPermission grpc error: sessionId={}, userId={}, err={}", sessionId, userId, e.toString());
            throw e;
        }
    }

    public ListSessionMembersResponse listSessionMembers(long sessionId) {
        try {
            SessionServiceGrpc.SessionServiceBlockingStub stub = grpcClientFactory.createStub(
                    "social-service",
                    channel -> SessionServiceGrpc.newBlockingStub(channel)
                            .withDeadline(Deadline.after(socialServiceTimeoutMs, TimeUnit.MILLISECONDS))
            );

            return stub.listSessionMembers(ListSessionMembersRequest.newBuilder()
                    .setSessionId(sessionId)
                    .build());
        } catch (StatusRuntimeException e) {
            log.warn("listSessionMembers grpc error: sessionId={}, err={}", sessionId, e.toString());
            throw e;
        }
    }
}
