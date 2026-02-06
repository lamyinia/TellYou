package org.com.pull.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.pull.application.MessagePullApplicationService;
import org.com.shared.proto.message.pull.v1.*;

@GrpcService
@RequiredArgsConstructor
public class MessagePullGrpcService extends MessagePullServiceGrpc.MessagePullServiceImplBase {

    private final MessagePullApplicationService applicationService;

    @Override
    public void pullWriteFanoutOfflineByUser(PullWriteFanoutOfflineByUserRequest request, StreamObserver<PullWriteFanoutOfflineByUserResponse> responseObserver) {
        PullWriteFanoutOfflineByUserResponse resp = applicationService.pullWriteFanoutOfflineByUser(request);
        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void pullReadFanoutOfflineBySessions(PullReadFanoutOfflineBySessionsRequest request, StreamObserver<PullReadFanoutOfflineBySessionsResponse> responseObserver) {
        PullReadFanoutOfflineBySessionsResponse resp = applicationService.pullReadFanoutOfflineBySessions(request);
        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void ackReadProgress(AckReadProgressRequest request, StreamObserver<AckReadProgressResponse> responseObserver) {
        AckReadProgressResponse resp = applicationService.ackReadProgress(request);
        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void batchGetSyncState(BatchGetSyncStateRequest request, StreamObserver<BatchGetSyncStateResponse> responseObserver) {
        BatchGetSyncStateResponse resp = applicationService.batchGetSyncState(request);
        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
