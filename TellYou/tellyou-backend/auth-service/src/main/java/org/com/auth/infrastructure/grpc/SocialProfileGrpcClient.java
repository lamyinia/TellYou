package org.com.auth.infrastructure.grpc;

import lombok.RequiredArgsConstructor;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.profile.v1.CreateDefaultProfileRequest;
import org.com.shared.proto.social.profile.v1.CreateDefaultProfileResponse;
import org.com.shared.proto.social.profile.v1.ProfileServiceGrpc;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SocialProfileGrpcClient {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${services.social.name:social-service}")
    private String socialServiceName;

    public boolean createDefaultProfile(long userId, String nickName, int sex) {
        ProfileServiceGrpc.ProfileServiceBlockingStub stub = grpcClientFactory.createStub(
            socialServiceName,
            channel -> ProfileServiceGrpc.newBlockingStub(channel)
        );

        CreateDefaultProfileRequest req = CreateDefaultProfileRequest.newBuilder()
            .setUserId(userId)
            .setNickName(nickName == null ? "" : nickName)
            .setSex(sex)
            .build();

        CreateDefaultProfileResponse resp = stub.createDefaultProfile(req);
        return resp.getCreated();
    }
}
