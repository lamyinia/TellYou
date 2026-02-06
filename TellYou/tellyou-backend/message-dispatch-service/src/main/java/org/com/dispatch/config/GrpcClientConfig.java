package org.com.dispatch.config;

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

    @Value("${grpc.use-plaintext:true}")
    private boolean usePlaintext;

    private GrpcClientFactory grpcClientFactory;

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
        log.info("gRPC客户端资源已释放");
    }
}
