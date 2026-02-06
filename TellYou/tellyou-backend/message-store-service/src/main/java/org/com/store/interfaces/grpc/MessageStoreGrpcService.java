package org.com.store.interfaces.grpc;

import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.shared.proto.message.store.v1.MessageStoreServiceGrpc;
import org.com.shared.proto.message.store.v1.PersistChatMessageRequest;
import org.com.shared.proto.message.store.v1.PersistChatMessageResponse;
import org.com.store.application.MessageStoreApplicationService;

@GrpcService
@RequiredArgsConstructor
public class MessageStoreGrpcService extends MessageStoreServiceGrpc.MessageStoreServiceImplBase {

    private final MessageStoreApplicationService applicationService;

    @Override
    public void persistChatMessage(PersistChatMessageRequest request, StreamObserver<PersistChatMessageResponse> responseObserver) {
        Integer appearance = request.getAppearance() == 0 ? null : request.getAppearance();

        MessageStoreApplicationService.PersistCommand cmd = new MessageStoreApplicationService.PersistCommand(
                request.getClientMessageId(),
                request.getType(),
                request.getTargetId(),
                request.getSessionId(),
                request.getSenderId(),
                request.getContent(),
                request.getClientTimeMs(),
                request.getPartitionId(),
                appearance,
                request.getTraceId()
        );

        MessageStoreApplicationService.PersistResult result = applicationService.persistChatMessage(cmd);

        PersistChatMessageResponse resp = PersistChatMessageResponse.newBuilder()
                .setPersisted(result.persisted())
                .setServerMessageId(result.msgId() <= 0 ? "" : String.valueOf(result.msgId()))
                .setSeq(result.seq())
                .setPartitionId(result.partitionId())
                .setAppearance(result.appearance() == null ? 0 : result.appearance())
                .setServerTimeMs(result.serverTimeMs())
                .setReason(result.reason() == null ? "" : result.reason())
                .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
