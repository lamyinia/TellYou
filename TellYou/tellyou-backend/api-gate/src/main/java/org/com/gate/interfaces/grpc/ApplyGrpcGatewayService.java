package org.com.gate.interfaces.grpc;

import io.grpc.Deadline;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.apply.v1.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.concurrent.TimeUnit;

@GrpcService
@RequiredArgsConstructor
public class ApplyGrpcGatewayService extends ApplyServiceGrpc.ApplyServiceImplBase {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${grpc.timeout.social-service:${grpc.timeout.default:5000}}")
    private long socialServiceTimeoutMs;

    @Override
    public void cursorPullIncomingApplies(CursorPullIncomingAppliesRequest request, StreamObserver<CursorPullIncomingAppliesResponse> responseObserver) {
        forward(stub -> stub.cursorPullIncomingApplies(request), responseObserver);
    }

    @Override
    public void cursorPullOutgoingApplies(CursorPullOutgoingAppliesRequest request, StreamObserver<CursorPullOutgoingAppliesResponse> responseObserver) {
        forward(stub -> stub.cursorPullOutgoingApplies(request), responseObserver);
    }

    @Override
    public void sendFriendApply(SendFriendApplyRequest request, StreamObserver<SendFriendApplyResponse> responseObserver) {
        forward(stub -> stub.sendFriendApply(request), responseObserver);
    }

    @Override
    public void acceptFriendApply(AcceptFriendApplyRequest request, StreamObserver<AcceptFriendApplyResponse> responseObserver) {
        forward(stub -> stub.acceptFriendApply(request), responseObserver);
    }

    private <T> void forward(java.util.function.Function<ApplyServiceGrpc.ApplyServiceBlockingStub, T> call, StreamObserver<T> responseObserver) {
        try {
            ApplyServiceGrpc.ApplyServiceBlockingStub stub = grpcClientFactory.createStub(
                "social-service",
                channel -> ApplyServiceGrpc.newBlockingStub(channel)
                    .withDeadline(Deadline.after(socialServiceTimeoutMs, TimeUnit.MILLISECONDS))
            );

            T resp = call.apply(stub);
            responseObserver.onNext(resp);
            responseObserver.onCompleted();
        } catch (StatusRuntimeException e) {
            responseObserver.onError(e);
        } catch (Exception e) {
            responseObserver.onError(io.grpc.Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }
}
