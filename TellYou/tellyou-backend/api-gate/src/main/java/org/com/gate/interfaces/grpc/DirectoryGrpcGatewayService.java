package org.com.gate.interfaces.grpc;

import io.grpc.Deadline;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.directory.v1.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.concurrent.TimeUnit;

@GrpcService
@RequiredArgsConstructor
public class DirectoryGrpcGatewayService extends DirectoryServiceGrpc.DirectoryServiceImplBase {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${grpc.timeout.social-service:${grpc.timeout.default:5000}}")
    private long socialServiceTimeoutMs;

    @Override
    public void pullContacts(PullContactsRequest request, StreamObserver<PullContactsResponse> responseObserver) {
        forward(stub -> stub.pullContacts(request), responseObserver);
    }

    @Override
    public void cursorPageContacts(CursorPageContactsRequest request, StreamObserver<CursorPageContactsResponse> responseObserver) {
        forward(stub -> stub.cursorPageContacts(request), responseObserver);
    }

    private <T> void forward(java.util.function.Function<DirectoryServiceGrpc.DirectoryServiceBlockingStub, T> call, StreamObserver<T> responseObserver) {
        try {
            DirectoryServiceGrpc.DirectoryServiceBlockingStub stub = grpcClientFactory.createStub(
                "social-service",
                channel -> DirectoryServiceGrpc.newBlockingStub(channel)
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
