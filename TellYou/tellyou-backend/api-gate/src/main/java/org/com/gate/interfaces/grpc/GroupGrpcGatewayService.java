package org.com.gate.interfaces.grpc;

import io.grpc.Deadline;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.proto.social.group.v1.*;
import org.springframework.beans.factory.annotation.Value;

import java.util.concurrent.TimeUnit;

@GrpcService
@RequiredArgsConstructor
public class GroupGrpcGatewayService extends GroupServiceGrpc.GroupServiceImplBase {

    private final GrpcClientFactory grpcClientFactory;

    @Value("${grpc.timeout.social-service:${grpc.timeout.default:5000}}")
    private long socialServiceTimeoutMs;

    @Override
    public void getBaseInfoList(GetBaseInfoListRequest request, StreamObserver<GetBaseInfoListResponse> responseObserver) {
        forward(stub -> stub.getBaseInfoList(request), responseObserver);
    }

    @Override
    public void createGroup(CreateGroupRequest request, StreamObserver<CreateGroupResponse> responseObserver) {
        forward(stub -> stub.createGroup(request), responseObserver);
    }

    @Override
    public void inviteFriends(InviteFriendsRequest request, StreamObserver<InviteFriendsResponse> responseObserver) {
        forward(stub -> stub.inviteFriends(request), responseObserver);
    }

    @Override
    public void sendJoinApply(SendJoinApplyRequest request, StreamObserver<SendJoinApplyResponse> responseObserver) {
        forward(stub -> stub.sendJoinApply(request), responseObserver);
    }

    @Override
    public void acceptJoinApplies(AcceptJoinAppliesRequest request, StreamObserver<AcceptJoinAppliesResponse> responseObserver) {
        forward(stub -> stub.acceptJoinApplies(request), responseObserver);
    }

    @Override
    public void leaveGroup(LeaveGroupRequest request, StreamObserver<LeaveGroupResponse> responseObserver) {
        forward(stub -> stub.leaveGroup(request), responseObserver);
    }

    @Override
    public void kickMember(KickMemberRequest request, StreamObserver<KickMemberResponse> responseObserver) {
        forward(stub -> stub.kickMember(request), responseObserver);
    }

    @Override
    public void modifyName(ModifyNameRequest request, StreamObserver<ModifyNameResponse> responseObserver) {
        forward(stub -> stub.modifyName(request), responseObserver);
    }

    @Override
    public void modifyNotification(ModifyNotificationRequest request, StreamObserver<ModifyNotificationResponse> responseObserver) {
        forward(stub -> stub.modifyNotification(request), responseObserver);
    }

    @Override
    public void modifyCard(ModifyCardRequest request, StreamObserver<ModifyCardResponse> responseObserver) {
        forward(stub -> stub.modifyCard(request), responseObserver);
    }

    @Override
    public void banChat(BanChatRequest request, StreamObserver<BanChatResponse> responseObserver) {
        forward(stub -> stub.banChat(request), responseObserver);
    }

    @Override
    public void transferOwner(TransferOwnerRequest request, StreamObserver<TransferOwnerResponse> responseObserver) {
        forward(stub -> stub.transferOwner(request), responseObserver);
    }

    @Override
    public void addManagers(AddManagersRequest request, StreamObserver<AddManagersResponse> responseObserver) {
        forward(stub -> stub.addManagers(request), responseObserver);
    }

    @Override
    public void withdrawManagers(WithdrawManagersRequest request, StreamObserver<WithdrawManagersResponse> responseObserver) {
        forward(stub -> stub.withdrawManagers(request), responseObserver);
    }

    @Override
    public void pageMemberInfoList(PageMemberInfoListRequest request, StreamObserver<PageMemberInfoListResponse> responseObserver) {
        forward(stub -> stub.pageMemberInfoList(request), responseObserver);
    }

    @Override
    public void pageInvitableFriendList(PageInvitableFriendListRequest request, StreamObserver<PageInvitableFriendListResponse> responseObserver) {
        forward(stub -> stub.pageInvitableFriendList(request), responseObserver);
    }

    @Override
    public void pageGroupApplyList(PageGroupApplyListRequest request, StreamObserver<PageGroupApplyListResponse> responseObserver) {
        forward(stub -> stub.pageGroupApplyList(request), responseObserver);
    }

    @Override
    public void dissolveGroup(DissolveGroupRequest request, StreamObserver<DissolveGroupResponse> responseObserver) {
        forward(stub -> stub.dissolveGroup(request), responseObserver);
    }

    private <T> void forward(java.util.function.Function<GroupServiceGrpc.GroupServiceBlockingStub, T> call, StreamObserver<T> responseObserver) {
        try {
            GroupServiceGrpc.GroupServiceBlockingStub stub = grpcClientFactory.createStub(
                "social-service",
                channel -> GroupServiceGrpc.newBlockingStub(channel)
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
