package org.com.social.interfaces.grpc;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.social.common.v1.ContactType;
import org.com.shared.proto.social.directory.v1.ContactEntry;
import org.com.shared.proto.social.directory.v1.CursorPageContactsRequest;
import org.com.shared.proto.social.directory.v1.CursorPageContactsResponse;
import org.com.shared.proto.social.directory.v1.DirectoryServiceGrpc;
import org.com.shared.proto.social.directory.v1.PullContactsRequest;
import org.com.shared.proto.social.directory.v1.PullContactsResponse;
import org.com.social.infrastructure.persistence.mapper.GroupRelationMapper;
import org.com.social.infrastructure.persistence.mapper.ImGroupMapper;
import org.com.social.infrastructure.persistence.po.GroupRelationDO;
import org.com.social.infrastructure.persistence.po.ImGroupDO;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@GrpcService
@RequiredArgsConstructor
public class DirectoryGrpcService extends DirectoryServiceGrpc.DirectoryServiceImplBase {

    private final GroupRelationMapper groupRelationMapper;

    private final ImGroupMapper imGroupMapper;

    @Override
    public void pullContacts(PullContactsRequest request, StreamObserver<PullContactsResponse> responseObserver) {
        try {
            List<GroupRelationDO> relations = groupRelationMapper.selectActiveByUserId(request.getUserId());
            if (relations == null || relations.isEmpty()) {
                responseObserver.onNext(PullContactsResponse.newBuilder().build());
                responseObserver.onCompleted();
                return;
            }

            List<Long> groupIds = relations.stream()
                .map(GroupRelationDO::getGroupId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

            if (groupIds.isEmpty()) {
                responseObserver.onNext(PullContactsResponse.newBuilder().build());
                responseObserver.onCompleted();
                return;
            }

            List<ImGroupDO> groups = imGroupMapper.selectByIds(groupIds);
            Map<Long, ImGroupDO> groupMap = groups.stream().collect(Collectors.toMap(ImGroupDO::getGroupId, g -> g, (a, b) -> a));

            List<ContactEntry> contacts = relations.stream()
                .map(r -> {
                    ImGroupDO g = groupMap.get(r.getGroupId());
                    if (g == null) {
                        return null;
                    }
                    return ContactEntry.newBuilder()
                        .setSessionId(g.getSessionId() == null ? 0L : g.getSessionId())
                        .setContactId(g.getGroupId() == null ? 0L : g.getGroupId())
                        .setRole(r.getRole() == null ? 0 : r.getRole())
                        .setContactType(ContactType.CONTACT_TYPE_GROUP)
                        .build();
                })
                .filter(c -> c != null)
                .toList();

            responseObserver.onNext(PullContactsResponse.newBuilder().addAllContacts(contacts).build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            responseObserver.onError(Status.INTERNAL.withDescription(e.getMessage()).withCause(e).asRuntimeException());
        }
    }

    @Override
    public void cursorPageContacts(CursorPageContactsRequest request, StreamObserver<CursorPageContactsResponse> responseObserver) {
        responseObserver.onNext(CursorPageContactsResponse.newBuilder().setCursor("").setIsLast(true).build());
        responseObserver.onCompleted();
    }
}
