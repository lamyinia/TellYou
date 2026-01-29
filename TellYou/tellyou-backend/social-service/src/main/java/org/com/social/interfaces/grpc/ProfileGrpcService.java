package org.com.social.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.profile.v1.CreateDefaultProfileRequest;
import org.com.shared.proto.social.profile.v1.CreateDefaultProfileResponse;
import org.com.shared.proto.social.profile.v1.ProfileServiceGrpc;
import org.com.social.application.ProfileApplicationService;

@GrpcService
@RequiredArgsConstructor
public class ProfileGrpcService extends ProfileServiceGrpc.ProfileServiceImplBase {

    private final ProfileApplicationService profileApplicationService;

    @Override
    public void createDefaultProfile(CreateDefaultProfileRequest request, StreamObserver<CreateDefaultProfileResponse> responseObserver) {
        boolean created = profileApplicationService.createDefaultProfile(
            request.getUserId(),
            request.getNickName(),
            request.getSex()
        );

        CreateDefaultProfileResponse resp = CreateDefaultProfileResponse.newBuilder()
            .setCreated(created)
            .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
