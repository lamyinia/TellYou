package org.com.shared.infrastructure.redis;

import org.redisson.api.RMap;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;

@Component
public class RedissonOnlineRouteRepository implements OnlineRouteRepository {

    private final RedissonClient redissonClient;

    public RedissonOnlineRouteRepository(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    private static String userRouteKey(long userId) {
        return "gw:route:user:" + userId;
    }

    @Override
    public void bind(long userId, String deviceId, String gatewayId, long ttlSeconds) {
        if (deviceId == null || deviceId.isBlank()) {
            return;
        }
        if (gatewayId == null || gatewayId.isBlank()) {
            return;
        }

        String key = userRouteKey(userId);
        RMap<String, String> map = redissonClient.getMap(key, StringCodec.INSTANCE);
        map.put(deviceId, gatewayId);

        if (ttlSeconds > 0) {
            map.expire(Duration.ofSeconds(ttlSeconds));
        }
    }

    @Override
    public void unbind(long userId, String deviceId, String gatewayId) {
        if (deviceId == null || deviceId.isBlank()) {
            return;
        }
        if (gatewayId == null || gatewayId.isBlank()) {
            return;
        }
        String key = userRouteKey(userId);
        RMap<String, String> map = redissonClient.getMap(key, StringCodec.INSTANCE);
        map.remove(deviceId, gatewayId);

        if (map.isEmpty()) {
            redissonClient.getKeys().delete(key);
        }
    }

    @Override
    public Map<String, String> listDeviceRoutes(long userId) {
        RMap<String, String> map = redissonClient.getMap(userRouteKey(userId), StringCodec.INSTANCE);
        return map.readAllMap();
    }

    @Override
    public String getGatewayId(long userId, String deviceId) {
        if (deviceId == null || deviceId.isBlank()) {
            return null;
        }
        RMap<String, String> map = redissonClient.getMap(userRouteKey(userId), StringCodec.INSTANCE);
        return map.get(deviceId);
    }
}
