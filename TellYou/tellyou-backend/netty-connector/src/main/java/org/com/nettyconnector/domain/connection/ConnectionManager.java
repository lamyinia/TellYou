package org.com.nettyconnector.domain.connection;

import org.com.nettyconnector.proto.connector.tcp.v1.Envelope;

import java.util.List;

public interface ConnectionManager {

    void bindAuthenticated(ConnectionKey key, ConnectionMeta meta, Object connectionRef);

    void unbindByChannelId(String channelId);

    void unbind(ConnectionKey key);

    List<ConnectionMeta> listByUser(long userId);

    int onlineCount(long userId);

    SendResult sendToUser(long userId, Envelope envelope, SendFilter filter);
}
