package org.com.dispatch.config;

import com.alibaba.nacos.api.exception.NacosException;
import org.com.shared.infrastructure.nacos.NacosServiceDiscovery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NacosDiscoveryConfig {

    @Value("${nacos.server-addr:localhost:8848}")
    private String serverAddr;

    @Value("${nacos.namespace:public}")
    private String namespace;

    @Value("${nacos.group:DEFAULT_GROUP}")
    private String group;

    @Value("${nacos.discovery.refresh-interval-seconds:10}")
    private long refreshIntervalSeconds;

    @Bean(destroyMethod = "shutdown")
    public NacosServiceDiscovery nacosServiceDiscovery() throws NacosException {
        return new NacosServiceDiscovery(serverAddr, namespace, group, refreshIntervalSeconds);
    }
}
