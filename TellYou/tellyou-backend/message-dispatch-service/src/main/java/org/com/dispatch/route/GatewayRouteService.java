package org.com.dispatch.route;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.com.shared.infrastructure.redis.OnlineRouteRepository;
import org.redisson.api.RBatch;
import org.redisson.api.RFuture;
import org.redisson.api.RMapAsync;
import org.redisson.api.RedissonClient;
import org.redisson.client.codec.StringCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Service
public class GatewayRouteService {

    private final OnlineRouteRepository onlineRouteRepository;

    private final RedissonClient redissonClient;

    private final Cache<Long, Map<String, String>> localCache;

    public GatewayRouteService(
            OnlineRouteRepository onlineRouteRepository,
            RedissonClient redissonClient,
            @Value("${route.local-cache-ttl-ms:2000}") long localCacheTtlMs,
            @Value("${route.local-cache-max-size:100000}") long localCacheMaxSize
    ) {
        this.onlineRouteRepository = onlineRouteRepository;
        this.redissonClient = redissonClient;

        this.localCache = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMillis(Math.max(1, localCacheTtlMs)))
                .maximumSize(Math.max(1, localCacheMaxSize))
                .build();
    }

    public Map<String, String> listUserDeviceRoutes(long userId) {
        if (userId <= 0) {
            return Map.of();
        }

        Map<String, String> cached = localCache.getIfPresent(userId);
        if (cached != null) {
            return cached;
        }

        Map<String, String> routes = onlineRouteRepository.listDeviceRoutes(userId);
        Map<String, String> safe = (routes == null || routes.isEmpty()) ? Map.of() : routes;
        localCache.put(userId, safe);
        return safe;
    }

    public Map<Long, Map<String, String>> listUserDeviceRoutesBatch(Collection<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        HashMap<Long, Map<String, String>> result = new HashMap<>(userIds.size());
        HashSet<Long> misses = new HashSet<>();

        for (Long uid : userIds) {
            if (uid == null || uid <= 0) {
                continue;
            }
            Map<String, String> cached = localCache.getIfPresent(uid);
            if (cached != null) {
                result.put(uid, cached);
            } else {
                misses.add(uid);
            }
        }

        if (misses.isEmpty()) {
            return result;
        }

        RBatch batch = redissonClient.createBatch();
        HashMap<Long, RFuture<Map<String, String>>> futures = new HashMap<>(misses.size());
        for (Long uid : misses) {
            RMapAsync<String, String> map = batch.getMap(userRouteKey(uid), StringCodec.INSTANCE);
            futures.put(uid, map.readAllMapAsync());
        }

        try {
            batch.execute();
        } catch (Exception e) {
            for (Long uid : misses) {
                Map<String, String> routes = onlineRouteRepository.listDeviceRoutes(uid);
                Map<String, String> safe = (routes == null || routes.isEmpty()) ? Map.of() : routes;
                localCache.put(uid, safe);
                result.put(uid, safe);
            }
            return result;
        }

        for (Map.Entry<Long, RFuture<Map<String, String>>> it : futures.entrySet()) {
            Long uid = it.getKey();
            RFuture<Map<String, String>> f = it.getValue();
            Map<String, String> routes;
            try {
                routes = f == null ? null : f.get();
            } catch (Exception e) {
                routes = null;
            }

            Map<String, String> safe = (routes == null || routes.isEmpty()) ? Map.of() : routes;
            localCache.put(uid, safe);
            result.put(uid, safe);
        }

        return result;
    }

    public String getGatewayId(long userId, String deviceId) {
        return onlineRouteRepository.getGatewayId(userId, deviceId);
    }

    private static String userRouteKey(long userId) {
        return "gw:route:user:" + userId;
    }
}
