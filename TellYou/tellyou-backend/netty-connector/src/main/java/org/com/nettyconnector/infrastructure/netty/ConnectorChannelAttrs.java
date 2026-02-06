package org.com.nettyconnector.infrastructure.netty;

import io.netty.util.AttributeKey;

public final class ConnectorChannelAttrs {

    private ConnectorChannelAttrs() {
    }

    public static final AttributeKey<Long> USER_ID = AttributeKey.valueOf("connector.userId");
    public static final AttributeKey<String> DEVICE_ID = AttributeKey.valueOf("connector.deviceId");
    public static final AttributeKey<String> CLIENT_ID = AttributeKey.valueOf("connector.clientId");
    public static final AttributeKey<Boolean> AUTHENTICATED = AttributeKey.valueOf("connector.authenticated");
    public static final AttributeKey<Long> CONNECTED_AT_MS = AttributeKey.valueOf("connector.connectedAtMs");
}
