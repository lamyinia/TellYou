package org.com.gate.interfaces.grpc;

import io.grpc.Deadline;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.relation.v1.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.concurrent.TimeUnit;

@GrpcService
@RequiredArgsConstructor
public class RelationGrpcGatewayService extends RelationServiceGrpc.RelationServiceImplBase {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${grpc.timeout.social-service:${grpc.timeout.default:5000}}")
    private long socialServiceTimeoutMs;

    @Override
    public void deleteFriend(DeleteFriendRequest request, StreamObserver<DeleteFriendResponse> responseObserver) {
        forward(stub -> stub.deleteFriend(request), responseObserver);
    }

    private <T> void forward(java.util.function.Function<RelationServiceGrpc.RelationServiceBlockingStub, T> call, StreamObserver<T> responseObserver) {
        try {
            RelationServiceGrpc.RelationServiceBlockingStub stub = grpcClientFactory.createStub(
                "social-service",
                channel -> RelationServiceGrpc.newBlockingStub(channel)
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
