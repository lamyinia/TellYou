package org.com.auth.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.auth.application.AuthApplicationService;
import org.com.shared.proto.auth.v1.AuthServiceGrpc;
import org.com.shared.proto.auth.v1.LoginRequest;
import org.com.shared.proto.auth.v1.LoginResponse;
import org.com.shared.proto.auth.v1.RegisterRequest;
import org.com.shared.proto.auth.v1.RegisterResponse;
import org.com.shared.proto.auth.v1.ValidateTokenRequest;
import org.com.shared.proto.auth.v1.ValidateTokenResponse;

@GrpcService
@RequiredArgsConstructor
public class AuthGrpcService extends AuthServiceGrpc.AuthServiceImplBase {

    private final AuthApplicationService authApplicationService;

    @Override
    public void register(RegisterRequest request, StreamObserver<RegisterResponse> responseObserver) {
        AuthApplicationService.AuthResult result = authApplicationService.register(
            request.getEmail(),
            request.getPassword(),
            request.getNickName(),
            request.getSex()
        );

        RegisterResponse resp = RegisterResponse.newBuilder()
            .setUserId(result.userId())
            .setToken(result.token())
            .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void login(LoginRequest request, StreamObserver<LoginResponse> responseObserver) {
        AuthApplicationService.AuthResult result = authApplicationService.login(
            request.getEmail(),
            request.getPassword()
        );

        LoginResponse resp = LoginResponse.newBuilder()
            .setUserId(result.userId())
            .setToken(result.token())
            .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }

    @Override
    public void validateToken(ValidateTokenRequest request, StreamObserver<ValidateTokenResponse> responseObserver) {
        AuthApplicationService.ValidateResult result = authApplicationService.validateToken(request.getToken());

        ValidateTokenResponse resp = ValidateTokenResponse.newBuilder()
            .setValid(result.valid())
            .setUserId(result.userId())
            .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
