package org.com.dispatch.infrastructure.connector;

import com.alibaba.nacos.api.naming.pojo.Instance;
import jakarta.annotation.PreDestroy;
import io.grpc.Deadline;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.proto.connector.deliver.v1.ConnectorDeliverServiceGrpc;
import org.com.shared.proto.connector.deliver.v1.DeliverChatRequest;
import org.com.shared.proto.connector.deliver.v1.DeliverChatResponse;
import org.com.nettyconnector.proto.connector.tcp.v1.ChatDeliver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class ConnectorDeliverClient {

    private record CachedChannel(String ip, int port, ManagedChannel channel, ConnectorDeliverServiceGrpc.ConnectorDeliverServiceBlockingStub stub) {
    }

    private final ConnectorInstanceResolver resolver;

    private final ConcurrentHashMap<String, CachedChannel> channelCache = new ConcurrentHashMap<>();

    @Value("${grpc.use-plaintext:true}")
    private boolean usePlaintext;

    @Value("${grpc.timeout.connector:${grpc.timeout.default:3000}}")
    private long connectorTimeoutMs;

    public ConnectorDeliverClient(ConnectorInstanceResolver resolver) {
        this.resolver = resolver;
    }

    public DeliverChatResponse deliver(String gatewayId, long userId, String deviceId, ChatDeliver deliver, String traceId) {
        Objects.requireNonNull(deliver, "deliver");

        Instance ins = resolver.resolveByGatewayId(gatewayId);
        if (ins == null) {
            log.debug("connector not found for gatewayId={}", gatewayId);
            return null;
        }

        String ip = ins.getIp();
        int port = resolver.resolveGrpcPort(ins);
        if (ip == null || ip.isBlank() || port <= 0) {
            log.warn("invalid connector instance: gatewayId={}, ip={}, port={}", gatewayId, ip, port);
            return null;
        }

        CachedChannel cached = channelCache.compute(gatewayId, (_k, old) -> {
            if (old != null && ip.equals(old.ip) && port == old.port) {
                return old;
            }
            if (old != null) {
                try {
                    old.channel.shutdown();
                } catch (Exception ignored) {
                }
            }

            ManagedChannelBuilder<?> b = ManagedChannelBuilder.forAddress(ip, port);
            if (usePlaintext) {
                b.usePlaintext();
            }
            ManagedChannel ch = b.build();
            ConnectorDeliverServiceGrpc.ConnectorDeliverServiceBlockingStub stub = ConnectorDeliverServiceGrpc.newBlockingStub(ch)
                    .withDeadline(Deadline.after(connectorTimeoutMs, TimeUnit.MILLISECONDS));
            return new CachedChannel(ip, port, ch, stub);
        });

        DeliverChatRequest.Builder req = DeliverChatRequest.newBuilder()
                .setUserId(userId)
                .setDeliver(deliver);

        if (deviceId != null) {
            req.setDeviceId(deviceId);
        }
        if (traceId != null) {
            req.setTraceId(traceId);
        }

        try {
            return cached.stub.deliverChat(req.build());
        } catch (Exception e) {
            log.debug("deliver grpc failed: gatewayId={}, userId={}, deviceId={}, err={}", gatewayId, userId, deviceId, e.toString());
            return null;
        }
    }

    public void shutdownAll() {
        for (CachedChannel it : channelCache.values()) {
            if (it == null) {
                continue;
            }
            try {
                it.channel.shutdown();
                it.channel.awaitTermination(1, TimeUnit.SECONDS);
            } catch (Exception ignored) {
            }
        }
        channelCache.clear();
    }

    @PreDestroy
    public void destroy() {
        shutdownAll();
    }
}
