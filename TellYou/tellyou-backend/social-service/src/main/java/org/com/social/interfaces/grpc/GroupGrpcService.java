package org.com.social.interfaces.grpc;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.group.v1.*;
import org.com.social.application.GroupApplicationService;
import org.com.social.infrastructure.persistence.mapper.GroupRelationMapper;
import org.com.social.infrastructure.persistence.mapper.ImGroupMapper;
import org.com.social.infrastructure.persistence.mapper.ImSessionMapper;
import org.com.social.infrastructure.persistence.mapper.SessionMemberMapper;
import org.com.social.infrastructure.persistence.po.GroupRelationDO;
import org.com.social.infrastructure.persistence.po.ImGroupDO;

import java.time.LocalDateTime;
import java.util.List;

@GrpcService
@RequiredArgsConstructor
public class GroupGrpcService extends GroupServiceGrpc.GroupServiceImplBase {

    private static final int ROLE_MANAGER = 2;

    private static final int ROLE_OWNER = 3;

    private static final int GROUP_STATE_DISSOLVED = 0;

    private static final int SESSION_STATE_INACTIVE = 0;

    private final GroupApplicationService groupApplicationService;

    private final ImGroupMapper imGroupMapper;

    private final ImSessionMapper imSessionMapper;

    private final GroupRelationMapper groupRelationMapper;

    private final SessionMemberMapper sessionMemberMapper;

    @Override
    public void createGroup(CreateGroupRequest request, StreamObserver<CreateGroupResponse> responseObserver) {
        try {
            GroupApplicationService.CreateGroupResult r = groupApplicationService.createGroup(
                request.getFromUserId(),
                request.getName(),
                null,
                null,
                null
            );

            CreateGroupResponse resp = CreateGroupResponse.newBuilder()
                .setCreated(true)
                .setReason("")
                .setGroupId(r.groupId())
                .setSessionId(r.sessionId())
                .build();

            responseObserver.onNext(resp);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void getBaseInfoList(GetBaseInfoListRequest request, StreamObserver<GetBaseInfoListResponse> responseObserver) {
        try {
            List<Long> groupIds = request.getGroupIdsList();
            if (groupIds == null || groupIds.isEmpty()) {
                responseObserver.onNext(GetBaseInfoListResponse.newBuilder().build());
                responseObserver.onCompleted();
                return;
            }

            List<ImGroupDO> groups = imGroupMapper.selectByIds(groupIds);
            List<GroupInfo> list = groups.stream()
                .map(g -> GroupInfo.newBuilder()
                    .setGroupId(g.getGroupId())
                    .setGroupName(g.getGroupName() == null ? "" : g.getGroupName())
                    .setAvatar(g.getAvatar() == null ? "" : g.getAvatar())
                    .setVersion(g.getVersion() == null ? 0 : g.getVersion())
                    .build())
                .toList();

            GetBaseInfoListResponse resp = GetBaseInfoListResponse.newBuilder()
                .addAllGroupInfoList(list)
                .build();

            responseObserver.onNext(resp);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void modifyName(ModifyNameRequest request, StreamObserver<ModifyNameResponse> responseObserver) {
        try {
            if (!hasManagerPower(request.getGroupId(), request.getFromUserId())) {
                responseObserver.onNext(ModifyNameResponse.newBuilder().setModified(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            int updated = imGroupMapper.updateName(request.getGroupId(), request.getName());
            responseObserver.onNext(ModifyNameResponse.newBuilder().setModified(updated > 0).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void modifyNotification(ModifyNotificationRequest request, StreamObserver<ModifyNotificationResponse> responseObserver) {
        try {
            if (!hasManagerPower(request.getGroupId(), request.getFromUserId())) {
                responseObserver.onNext(ModifyNotificationResponse.newBuilder().setModified(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            int updated = imGroupMapper.updateNotification(request.getGroupId(), request.getNotification());
            responseObserver.onNext(ModifyNotificationResponse.newBuilder().setModified(updated > 0).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void modifyCard(ModifyCardRequest request, StreamObserver<ModifyCardResponse> responseObserver) {
        try {
            if (!hasManagerPower(request.getGroupId(), request.getFromUserId())) {
                responseObserver.onNext(ModifyCardResponse.newBuilder().setModified(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            int updated = imGroupMapper.updateCard(request.getGroupId(), request.getCard());
            responseObserver.onNext(ModifyCardResponse.newBuilder().setModified(updated > 0).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void banChat(BanChatRequest request, StreamObserver<BanChatResponse> responseObserver) {
        try {
            if (!hasManagerPower(request.getGroupId(), request.getFromUserId())) {
                responseObserver.onNext(BanChatResponse.newBuilder().setModified(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            int updated = imGroupMapper.updateSpeakMode(request.getGroupId(), request.getChatMode());
            responseObserver.onNext(BanChatResponse.newBuilder().setModified(updated > 0).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void pageMemberInfoList(PageMemberInfoListRequest request, StreamObserver<PageMemberInfoListResponse> responseObserver) {
        try {
            if (!isActiveMember(request.getGroupId(), request.getFromUserId())) {
                responseObserver.onNext(PageMemberInfoListResponse.newBuilder().setPageNo(0).setPageSize(0).setTotalRecords(0).setIsLast(true).build());
                responseObserver.onCompleted();
                return;
            }

            int pageNo = request.hasPage() ? (int) request.getPage().getPageNo() : 1;
            int pageSize = request.hasPage() ? (int) request.getPage().getPageSize() : 20;
            if (pageNo <= 0) {
                pageNo = 1;
            }
            if (pageSize <= 0) {
                pageSize = 20;
            }

            long total = groupRelationMapper.countActiveByGroupId(request.getGroupId());
            long offset = (long) (pageNo - 1) * pageSize;

            List<GroupRelationDO> page = groupRelationMapper.selectActivePageByGroupId(request.getGroupId(), offset, pageSize);
            List<GroupMemberInfo> list = page.stream()
                .map(r -> GroupMemberInfo.newBuilder()
                    .setUserId(r.getUserId() == null ? 0L : r.getUserId())
                    .setRole(r.getRole() == null ? 0 : r.getRole())
                    .build())
                .toList();

            boolean isLast = offset + page.size() >= total;

            PageMemberInfoListResponse resp = PageMemberInfoListResponse.newBuilder()
                .setPageNo(pageNo)
                .setPageSize(pageSize)
                .setTotalRecords(total)
                .setIsLast(isLast)
                .addAllList(list)
                .build();

            responseObserver.onNext(resp);
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void leaveGroup(LeaveGroupRequest request, StreamObserver<LeaveGroupResponse> responseObserver) {
        try {
            ImGroupDO group = imGroupMapper.selectById(request.getGroupId());
            if (group == null) {
                responseObserver.onNext(LeaveGroupResponse.newBuilder().setLeft(false).setReason("group_not_found").build());
                responseObserver.onCompleted();
                return;
            }

            GroupRelationDO relation = groupRelationMapper.selectOne(request.getGroupId(), request.getFromUserId());
            if (relation == null || relation.getIsActive() == null || relation.getIsActive() != 1) {
                responseObserver.onNext(LeaveGroupResponse.newBuilder().setLeft(false).setReason("not_member").build());
                responseObserver.onCompleted();
                return;
            }

            if (relation.getRole() != null && relation.getRole() == ROLE_OWNER) {
                responseObserver.onNext(LeaveGroupResponse.newBuilder().setLeft(false).setReason("owner_cannot_leave").build());
                responseObserver.onCompleted();
                return;
            }

            LocalDateTime now = LocalDateTime.now();
            groupRelationMapper.deactivate(request.getGroupId(), request.getFromUserId(), now);
            sessionMemberMapper.deactivate(group.getSessionId(), request.getFromUserId(), now);

            syncMemberCount(group.getGroupId());

            responseObserver.onNext(LeaveGroupResponse.newBuilder().setLeft(true).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void kickMember(KickMemberRequest request, StreamObserver<KickMemberResponse> responseObserver) {
        try {
            ImGroupDO group = imGroupMapper.selectById(request.getGroupId());
            if (group == null) {
                responseObserver.onNext(KickMemberResponse.newBuilder().setKicked(false).setReason("group_not_found").build());
                responseObserver.onCompleted();
                return;
            }

            GroupRelationDO operator = groupRelationMapper.selectOne(request.getGroupId(), request.getFromUserId());
            if (operator == null || operator.getIsActive() == null || operator.getIsActive() != 1 || operator.getRole() == null || operator.getRole() < ROLE_MANAGER) {
                responseObserver.onNext(KickMemberResponse.newBuilder().setKicked(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            GroupRelationDO target = groupRelationMapper.selectOne(request.getGroupId(), request.getTargetId());
            if (target == null || target.getIsActive() == null || target.getIsActive() != 1) {
                responseObserver.onNext(KickMemberResponse.newBuilder().setKicked(false).setReason("target_not_member").build());
                responseObserver.onCompleted();
                return;
            }

            if (target.getRole() != null && target.getRole() == ROLE_OWNER) {
                responseObserver.onNext(KickMemberResponse.newBuilder().setKicked(false).setReason("cannot_kick_owner").build());
                responseObserver.onCompleted();
                return;
            }

            LocalDateTime now = LocalDateTime.now();
            groupRelationMapper.deactivate(request.getGroupId(), request.getTargetId(), now);
            sessionMemberMapper.deactivate(group.getSessionId(), request.getTargetId(), now);

            syncMemberCount(group.getGroupId());

            responseObserver.onNext(KickMemberResponse.newBuilder().setKicked(true).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void dissolveGroup(DissolveGroupRequest request, StreamObserver<DissolveGroupResponse> responseObserver) {
        try {
            ImGroupDO group = imGroupMapper.selectById(request.getGroupId());
            if (group == null) {
                responseObserver.onNext(DissolveGroupResponse.newBuilder().setDissolved(false).setReason("group_not_found").build());
                responseObserver.onCompleted();
                return;
            }

            GroupRelationDO relation = groupRelationMapper.selectOne(request.getGroupId(), request.getFromUserId());
            if (relation == null || relation.getIsActive() == null || relation.getIsActive() != 1 || relation.getRole() == null || relation.getRole() != ROLE_OWNER) {
                responseObserver.onNext(DissolveGroupResponse.newBuilder().setDissolved(false).setReason("no_permission").build());
                responseObserver.onCompleted();
                return;
            }

            imGroupMapper.updateState(group.getGroupId(), GROUP_STATE_DISSOLVED);
            imSessionMapper.updateState(group.getSessionId(), SESSION_STATE_INACTIVE);

            responseObserver.onNext(DissolveGroupResponse.newBuilder().setDissolved(true).setReason("").build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void inviteFriends(InviteFriendsRequest request, StreamObserver<InviteFriendsResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void sendJoinApply(SendJoinApplyRequest request, StreamObserver<SendJoinApplyResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void acceptJoinApplies(AcceptJoinAppliesRequest request, StreamObserver<AcceptJoinAppliesResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void transferOwner(TransferOwnerRequest request, StreamObserver<TransferOwnerResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void addManagers(AddManagersRequest request, StreamObserver<AddManagersResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void withdrawManagers(WithdrawManagersRequest request, StreamObserver<WithdrawManagersResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void pageInvitableFriendList(PageInvitableFriendListRequest request, StreamObserver<PageInvitableFriendListResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    @Override
    public void pageGroupApplyList(PageGroupApplyListRequest request, StreamObserver<PageGroupApplyListResponse> responseObserver) {
        responseObserver.onError(Status.UNIMPLEMENTED.asRuntimeException());
    }

    private boolean hasManagerPower(long groupId, long userId) {
        GroupRelationDO relation = groupRelationMapper.selectOne(groupId, userId);
        return relation != null
            && relation.getIsActive() != null
            && relation.getIsActive() == 1
            && relation.getRole() != null
            && relation.getRole() >= ROLE_MANAGER;
    }

    private boolean isActiveMember(long groupId, long userId) {
        GroupRelationDO relation = groupRelationMapper.selectOne(groupId, userId);
        return relation != null && relation.getIsActive() != null && relation.getIsActive() == 1;
    }

    private void syncMemberCount(long groupId) {
        long cnt = groupRelationMapper.countActiveByGroupId(groupId);
        imGroupMapper.updateMemberCount(groupId, (int) cnt);
    }
}
