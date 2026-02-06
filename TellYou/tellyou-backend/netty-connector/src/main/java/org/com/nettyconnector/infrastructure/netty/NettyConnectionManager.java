package org.com.nettyconnector.infrastructure.netty;

import io.netty.channel.Channel;
import lombok.RequiredArgsConstructor;
import org.com.nettyconnector.domain.connection.ConnectionKey;
import org.com.nettyconnector.domain.connection.ConnectionManager;
import org.com.nettyconnector.domain.connection.ConnectionMeta;
import org.com.nettyconnector.domain.connection.SendFilter;
import org.com.nettyconnector.domain.connection.SendResult;
import org.com.nettyconnector.proto.connector.tcp.v1.Envelope;
import org.com.shared.infrastructure.redis.OnlineRouteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class NettyConnectionManager implements ConnectionManager {

    private record Entry(ConnectionMeta meta, Channel channel) {
    }

    private final ConcurrentHashMap<Long, ConcurrentHashMap<String, Entry>> userDeviceConnections = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConnectionKey> channelIndex = new ConcurrentHashMap<>();

    private final OnlineRouteRepository onlineRouteRepository;

    @Value("${gateway.route.ttl-seconds:300}")
    private long routeTtlSeconds;

    @Override
    public void bindAuthenticated(ConnectionKey key, ConnectionMeta meta, Object connectionRef) {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(meta, "meta");

        if (!(connectionRef instanceof Channel channel)) {
            throw new IllegalArgumentException("connectionRef must be a Netty Channel");
        }

        ConcurrentHashMap<String, Entry> deviceMap = userDeviceConnections.computeIfAbsent(key.userId(), _k -> new ConcurrentHashMap<>());
        Entry newEntry = new Entry(meta, channel);

        Entry old = deviceMap.put(key.deviceId(), newEntry);
        channelIndex.put(meta.channelId(), key);

        onlineRouteRepository.bind(key.userId(), key.deviceId(), meta.gatewayId(), routeTtlSeconds);

        if (old != null) {
            channelIndex.remove(old.meta.channelId());
            Channel oldCh = old.channel;
            if (oldCh != null && oldCh != channel) {
                oldCh.eventLoop().execute(oldCh::close);
            }
        }
    }

    @Override
    public void unbindByChannelId(String channelId) {
        if (channelId == null || channelId.isBlank()) {
            return;
        }
        ConnectionKey key = channelIndex.remove(channelId);
        if (key == null) {
            return;
        }
        unbind(key);
    }

    @Override
    public void unbind(ConnectionKey key) {
        if (key == null) {
            return;
        }
        ConcurrentHashMap<String, Entry> deviceMap = userDeviceConnections.get(key.userId());
        if (deviceMap == null) {
            return;
        }
        Entry removed = deviceMap.remove(key.deviceId());
        if (removed != null) {
            channelIndex.remove(removed.meta.channelId());
            onlineRouteRepository.unbind(key.userId(), key.deviceId(), removed.meta.gatewayId());
        }
        if (deviceMap.isEmpty()) {
            userDeviceConnections.remove(key.userId(), deviceMap);
        }
    }

    @Override
    public List<ConnectionMeta> listByUser(long userId) {
        Map<String, Entry> deviceMap = userDeviceConnections.get(userId);
        if (deviceMap == null || deviceMap.isEmpty()) {
            return List.of();
        }
        List<ConnectionMeta> metas = new ArrayList<>(deviceMap.size());
        for (Entry e : deviceMap.values()) {
            if (e != null) {
                metas.add(e.meta);
            }
        }
        return metas;
    }

    @Override
    public int onlineCount(long userId) {
        Map<String, Entry> deviceMap = userDeviceConnections.get(userId);
        return deviceMap == null ? 0 : deviceMap.size();
    }

    @Override
    public SendResult sendToUser(long userId, Envelope envelope, SendFilter filter) {
        Map<String, Entry> deviceMap = userDeviceConnections.get(userId);
        if (deviceMap == null || deviceMap.isEmpty()) {
            return new SendResult(0, 1, 0, 0);
        }

        int delivered = 0;
        int offline = 0;
        int notWritable = 0;
        int errors = 0;

        for (Map.Entry<String, Entry> it : deviceMap.entrySet()) {
            String deviceId = it.getKey();
            if (filter != null && !filter.matchesDeviceId(deviceId)) {
                continue;
            }

            Entry entry = it.getValue();
            if (entry == null) {
                offline++;
                continue;
            }

            Channel ch = entry.channel;
            if (ch == null || !ch.isActive()) {
                offline++;
                continue;
            }

            if (!ch.isWritable()) {
                notWritable++;
                continue;
            }

            try {
                ch.eventLoop().execute(() -> ch.writeAndFlush(envelope));
                delivered++;
            } catch (Exception e) {
                errors++;
            }
        }

        return new SendResult(delivered, offline, notWritable, errors);
    }
}
