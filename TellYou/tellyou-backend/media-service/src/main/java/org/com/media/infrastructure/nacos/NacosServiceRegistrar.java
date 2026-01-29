package org.com.media.infrastructure.nacos;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class NacosServiceRegistrar {

    @Value("${spring.application.name}")
    private String serviceName;

    @Value("${nacos.server-addr:localhost:8848}")
    private String serverAddr;

    @Value("${nacos.namespace:public}")
    private String namespace;

    @Value("${nacos.group:DEFAULT_GROUP}")
    private String group;

    @Value("${grpc.server.port:9093}")
    private int grpcPort;

    @Value("${service.ip:}")
    private String configuredIp;

    private org.com.shared.infrastructure.nacos.NacosServiceRegistrar sharedRegistrar;

    @PostConstruct
    public void register() {
        try {
            this.sharedRegistrar = new org.com.shared.infrastructure.nacos.NacosServiceRegistrar(serverAddr, namespace, group);

            Map<String, String> metadata = new HashMap<>();
            metadata.put("grpc.port", String.valueOf(grpcPort));

            String ip = resolveIp();
            sharedRegistrar.register(serviceName, ip, grpcPort, metadata);
            log.info("Nacos注册成功: service={}, group={}, {}:{} grpc.port={}", serviceName, group, ip, grpcPort, grpcPort);
        } catch (Exception e) {
            log.error("Nacos注册失败: service={} group={}", serviceName, group, e);
            throw new RuntimeException(e);
        }
    }

    @PreDestroy
    public void deregister() {
        if (sharedRegistrar == null) {
            return;
        }
        try {
            sharedRegistrar.deregisterLastIfPresent();
            sharedRegistrar.shutdown();
            log.info("Nacos注销成功: service={}, group={}", serviceName, group);
        } catch (Exception e) {
            log.warn("Nacos注销失败: service={} group={}", serviceName, group, e);
        }
    }

    private String resolveIp() {
        if (configuredIp != null && !configuredIp.isBlank()) {
            return configuredIp;
        }
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            throw new RuntimeException("无法解析本机IP，请配置 service.ip", e);
        }
    }
}
