package org.com.social.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.session.v1.CheckSendPermissionRequest;
import org.com.shared.proto.social.session.v1.CheckSendPermissionResponse;
import org.com.shared.proto.social.session.v1.GetSessionRequest;
import org.com.shared.proto.social.session.v1.GetSessionResponse;
import org.com.shared.proto.social.session.v1.ListSessionMembersRequest;
import org.com.shared.proto.social.session.v1.ListSessionMembersResponse;
import org.com.shared.proto.social.session.v1.SessionMember;
import org.com.shared.proto.social.session.v1.SessionServiceGrpc;
import org.com.social.application.SessionApplicationService;
import org.com.social.infrastructure.persistence.po.ImSessionDO;
import org.com.social.infrastructure.persistence.po.SessionMemberDO;

import java.util.List;

@GrpcService
@RequiredArgsConstructor
public class SessionGrpcService extends SessionServiceGrpc.SessionServiceImplBase {

    private final SessionApplicationService sessionApplicationService;

    @Override
    public void getSession(GetSessionRequest request, StreamObserver<GetSessionResponse> responseObserver) {
        ImSessionDO session = sessionApplicationService.getSession(request.getSessionId());

        GetSessionResponse.Builder builder = GetSessionResponse.newBuilder();
        if (session == null) {
            builder.setFound(false);
        } else {
            builder.setFound(true);
            builder.setSessionType(session.getSessionType() == null ? 0 : session.getSessionType());
            builder.setState(session.getState() == null ? 0 : session.getState());
            builder.setMessageFlags(session.getMessageFlags() == null ? 0 : session.getMessageFlags());
        }

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void listSessionMembers(ListSessionMembersRequest request, StreamObserver<ListSessionMembersResponse> responseObserver) {
        List<SessionMemberDO> members = sessionApplicationService.listSessionMembers(request.getSessionId());

        ListSessionMembersResponse.Builder resp = ListSessionMembersResponse.newBuilder();
        for (SessionMemberDO m : members) {
            SessionMember.Builder item = SessionMember.newBuilder()
                    .setUserId(m.getUserId() == null ? 0 : m.getUserId())
                    .setRole(m.getRole() == null ? 0 : m.getRole())
                    .setIsActive(m.getIsActive() != null && m.getIsActive() == 1);
            resp.addMembers(item.build());
        }

        responseObserver.onNext(resp.build());
        responseObserver.onCompleted();
    }

    @Override
    public void checkSendPermission(CheckSendPermissionRequest request, StreamObserver<CheckSendPermissionResponse> responseObserver) {
        SessionApplicationService.CheckResult result = sessionApplicationService.checkSendPermission(
                request.getSessionId(),
                request.getUserId(),
                request.getPartitionId()
        );

        CheckSendPermissionResponse resp = CheckSendPermissionResponse.newBuilder()
                .setAllowed(result.allowed())
                .setReason(result.reason() == null ? "" : result.reason())
                .setMessageFlags(result.messageFlags())
                .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
