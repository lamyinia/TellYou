package org.com.dispatch.infrastructure.nacos;

import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.pojo.Instance;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.infrastructure.nacos.NacosServiceDiscovery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class ConnectorDirectory {

    @Value("${services.connector.name:netty-connector}")
    private String connectorServiceName;

    private final NacosServiceDiscovery discovery;

    private volatile List<Instance> connectors = List.of();

    public ConnectorDirectory(NacosServiceDiscovery discovery) {
        this.discovery = discovery;
    }

    public List<Instance> getConnectors() {
        return connectors;
    }

    @PostConstruct
    public void init() throws NacosException {
        this.connectors = discovery.subscribeAndCache(connectorServiceName, instances -> {
            this.connectors = instances;
            log.info("ConnectorDirectory变更: service={}, instances={}", connectorServiceName, instances.size());
        });
        log.info("ConnectorDirectory初始化: service={}, instances={}", connectorServiceName, connectors.size());
    }
}
