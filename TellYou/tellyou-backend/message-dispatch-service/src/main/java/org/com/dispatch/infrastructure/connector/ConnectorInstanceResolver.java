package org.com.dispatch.infrastructure.connector;

import com.alibaba.nacos.api.naming.pojo.Instance;
import org.com.dispatch.infrastructure.nacos.ConnectorDirectory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class ConnectorInstanceResolver {

    private final ConnectorDirectory connectorDirectory;

    public ConnectorInstanceResolver(ConnectorDirectory connectorDirectory) {
        this.connectorDirectory = connectorDirectory;
    }

    public Instance resolveByGatewayId(String gatewayId) {
        if (gatewayId == null || gatewayId.isBlank()) {
            return null;
        }
        List<Instance> instances = connectorDirectory.getConnectors();
        if (instances == null || instances.isEmpty()) {
            return null;
        }
        for (Instance it : instances) {
            if (it == null) {
                continue;
            }
            Map<String, String> md = it.getMetadata();
            if (md == null || md.isEmpty()) {
                continue;
            }
            String gid = md.get("gateway.id");
            if (gatewayId.equals(gid)) {
                return it;
            }
        }
        return null;
    }

    public int resolveGrpcPort(Instance instance) {
        if (instance == null) {
            return 0;
        }
        Map<String, String> md = instance.getMetadata();
        if (md != null) {
            String v = md.get("grpc.port");
            if (v != null && !v.isBlank()) {
                try {
                    return Integer.parseInt(v);
                } catch (Exception ignored) {
                }
            }
        }
        return instance.getPort();
    }
}
