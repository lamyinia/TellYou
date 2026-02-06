package org.com.shared.infrastructure.redis;

import java.util.Map;

public interface OnlineRouteRepository {

    void bind(long userId, String deviceId, String gatewayId, long ttlSeconds);

    void unbind(long userId, String deviceId, String gatewayId);

    Map<String, String> listDeviceRoutes(long userId);

    String getGatewayId(long userId, String deviceId);
}
