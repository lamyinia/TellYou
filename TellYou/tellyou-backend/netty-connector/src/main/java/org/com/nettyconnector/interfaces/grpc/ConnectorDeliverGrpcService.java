package org.com.nettyconnector.interfaces.grpc;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;
import org.com.nettyconnector.domain.connection.ConnectionManager;
import org.com.nettyconnector.domain.connection.SendFilter;
import org.com.nettyconnector.domain.connection.SendResult;
import org.com.nettyconnector.proto.connector.tcp.v1.Envelope;
import org.com.shared.proto.connector.deliver.v1.ConnectorDeliverServiceGrpc;
import org.com.shared.proto.connector.deliver.v1.DeliverChatRequest;
import org.com.shared.proto.connector.deliver.v1.DeliverChatResponse;

import java.util.Set;

@GrpcService
public class ConnectorDeliverGrpcService extends ConnectorDeliverServiceGrpc.ConnectorDeliverServiceImplBase {

    private final ConnectionManager connectionManager;

    public ConnectorDeliverGrpcService(ConnectionManager connectionManager) {
        this.connectionManager = connectionManager;
    }

    @Override
    public void deliverChat(DeliverChatRequest request, StreamObserver<DeliverChatResponse> responseObserver) {
        long userId = request.getUserId();
        if (userId <= 0) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("user_id must be positive").asRuntimeException());
            return;
        }
        if (!request.hasDeliver()) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("missing deliver").asRuntimeException());
            return;
        }

        String traceId = request.getTraceId();
        if (traceId == null) {
            traceId = "";
        }

        Envelope envelope = Envelope.newBuilder()
                .setVersion(1)
                .setStreamId(0)
                .setTimestampMs(System.currentTimeMillis())
                .setTraceId(traceId)
                .setChatDeliver(request.getDeliver())
                .build();

        SendFilter filter = null;
        String deviceId = request.getDeviceId();
        if (deviceId != null && !deviceId.isBlank()) {
            filter = new SendFilter(Set.of(deviceId), null);
        }

        SendResult result = connectionManager.sendToUser(userId, envelope, filter);

        DeliverChatResponse resp = DeliverChatResponse.newBuilder()
                .setDelivered(result.delivered())
                .setOffline(result.offline())
                .setNotWritable(result.notWritable())
                .setErrors(result.errors())
                .build();

        responseObserver.onNext(resp);
        responseObserver.onCompleted();
    }
}
