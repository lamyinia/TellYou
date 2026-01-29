package org.com.nettyconnector.infrastructure.nacos;

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

    @Value("${grpc.server.port:9092}")
    private int grpcPort;

    @Value("${service.ip:}")
    private String configuredIp;

    @Value("${gateway.id:}")
    private String gatewayId;

    @Value("${netty.tcp.port:7070}")
    private int tcpPort;

    private org.com.shared.infrastructure.nacos.NacosServiceRegistrar sharedRegistrar;

    @PostConstruct
    public void register() {
        try {
            this.sharedRegistrar = new org.com.shared.infrastructure.nacos.NacosServiceRegistrar(serverAddr, namespace, group);

            Map<String, String> metadata = new HashMap<>();
            metadata.put("grpc.port", String.valueOf(grpcPort));
            if (gatewayId != null && !gatewayId.isBlank()) {
                metadata.put("gateway.id", gatewayId);
            }
            metadata.put("netty.tcp.port", String.valueOf(tcpPort));

            String ip = resolveIp();
            sharedRegistrar.register(serviceName, ip, grpcPort, metadata);
            log.info("Nacos注册成功: service={}, group={}, {}:{} gateway.id={}, netty.tcp.port={}",
                    serviceName, group, ip, grpcPort, gatewayId, tcpPort);
        } catch (Exception e) {
            log.error("Nacos注册失败: service={} group={}", serviceName, group, e);
            throw new RuntimeException(e);
        }
    }

    @PreDestroy
    public void deregister() {
        try {
            String ip = resolveIp();
            if (sharedRegistrar != null) {
                sharedRegistrar.deregister(serviceName, ip, grpcPort);
                sharedRegistrar.shutdown();
            }
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
