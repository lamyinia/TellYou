package org.com.nettyconnector.domain.connection;

public record ConnectionMeta(
        String clientId,
        String gatewayId,
        String channelId,
        long connectedAtMs,
        long authenticatedAtMs
) {
}
