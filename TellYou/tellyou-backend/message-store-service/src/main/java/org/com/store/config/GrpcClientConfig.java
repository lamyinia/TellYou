package org.com.store.config;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.infrastructure.grpc.GrpcClientFactory;
import org.com.shared.infrastructure.nacos.NacosServiceDiscovery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class GrpcClientConfig {

    @Value("${nacos.server-addr:localhost:8848}")
    private String nacosServerAddr;

    @Value("${nacos.namespace:public}")
    private String nacosNamespace;

    @Value("${nacos.group:DEFAULT_GROUP}")
    private String nacosGroup;

    @Value("${grpc.use-plaintext:true}")
    private boolean usePlaintext;

    private NacosServiceDiscovery serviceDiscovery;
    private GrpcClientFactory grpcClientFactory;

    @Bean
    public NacosServiceDiscovery nacosServiceDiscovery() {
        try {
            this.serviceDiscovery = new NacosServiceDiscovery(nacosServerAddr, nacosNamespace, nacosGroup);
            log.info("Nacos服务发现初始化成功");
            return this.serviceDiscovery;
        } catch (Exception e) {
            log.error("Nacos服务发现初始化失败", e);
            throw new RuntimeException("Nacos服务发现初始化失败", e);
        }
    }

    @Bean
    public GrpcClientFactory grpcClientFactory(NacosServiceDiscovery serviceDiscovery) {
        this.grpcClientFactory = new GrpcClientFactory(serviceDiscovery, usePlaintext);
        log.info("gRPC客户端工厂初始化成功");
        return this.grpcClientFactory;
    }

    @PreDestroy
    public void destroy() {
        if (grpcClientFactory != null) {
            grpcClientFactory.shutdown();
        }
        if (serviceDiscovery != null) {
            serviceDiscovery.shutdown();
        }
        log.info("gRPC客户端资源已释放");
    }
}
