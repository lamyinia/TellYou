package org.com.social.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.relation.v1.DeleteFriendRequest;
import org.com.shared.proto.social.relation.v1.DeleteFriendResponse;
import org.com.shared.proto.social.relation.v1.RelationServiceGrpc;

@GrpcService
@RequiredArgsConstructor
public class RelationGrpcService extends RelationServiceGrpc.RelationServiceImplBase {

    @Override
    public void deleteFriend(DeleteFriendRequest request, StreamObserver<DeleteFriendResponse> responseObserver) {
        responseObserver.onNext(DeleteFriendResponse.newBuilder().setDeleted(false).setReason("not_implemented").build());
        responseObserver.onCompleted();
    }
}
