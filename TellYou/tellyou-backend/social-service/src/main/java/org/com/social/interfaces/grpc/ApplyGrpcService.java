package org.com.social.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.apply.v1.*;

@GrpcService
@RequiredArgsConstructor
public class ApplyGrpcService extends ApplyServiceGrpc.ApplyServiceImplBase {

    @Override
    public void cursorPullIncomingApplies(CursorPullIncomingAppliesRequest request, StreamObserver<CursorPullIncomingAppliesResponse> responseObserver) {
        responseObserver.onNext(CursorPullIncomingAppliesResponse.newBuilder().setCursor("").setIsLast(true).build());
        responseObserver.onCompleted();
    }

    @Override
    public void cursorPullOutgoingApplies(CursorPullOutgoingAppliesRequest request, StreamObserver<CursorPullOutgoingAppliesResponse> responseObserver) {
        responseObserver.onNext(CursorPullOutgoingAppliesResponse.newBuilder().setCursor("").setIsLast(true).build());
        responseObserver.onCompleted();
    }

    @Override
    public void sendFriendApply(SendFriendApplyRequest request, StreamObserver<SendFriendApplyResponse> responseObserver) {
        responseObserver.onNext(SendFriendApplyResponse.newBuilder().setAccepted(false).setReason("not_implemented").build());
        responseObserver.onCompleted();
    }

    @Override
    public void acceptFriendApply(AcceptFriendApplyRequest request, StreamObserver<AcceptFriendApplyResponse> responseObserver) {
        responseObserver.onNext(AcceptFriendApplyResponse.newBuilder().setAccepted(false).setReason("not_implemented").setSessionId(0L).build());
        responseObserver.onCompleted();
    }
}
