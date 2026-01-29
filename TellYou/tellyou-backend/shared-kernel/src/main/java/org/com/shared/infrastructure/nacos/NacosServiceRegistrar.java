package org.com.shared.infrastructure.nacos;

import com.alibaba.nacos.api.NacosFactory;
import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingService;
import com.alibaba.nacos.api.naming.pojo.Instance;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;

public class NacosServiceRegistrar {

    private final NamingService namingService;
    private final String group;

    private volatile Registration lastRegistration;

    public NacosServiceRegistrar(String serverAddr, String namespace, String group) {
        try {
            Properties properties = new Properties();
            properties.put("serverAddr", serverAddr);
            properties.put("namespace", namespace);
            this.namingService = NacosFactory.createNamingService(properties);
            this.group = group;
        } catch (NacosException e) {
            throw new ServiceDiscoveryException("初始化 Nacos 注册器失败", e);
        }
    }

    public void register(String serviceName, String ip, int port, Map<String, String> metadata) {
        Objects.requireNonNull(serviceName, "serviceName");
        Objects.requireNonNull(ip, "ip");

        Instance instance = new Instance();
        instance.setIp(ip);
        instance.setPort(port);
        instance.setHealthy(true);
        instance.setEnabled(true);
        instance.setMetadata(metadata == null ? new HashMap<>() : new HashMap<>(metadata));

        try {
            namingService.registerInstance(serviceName, group, instance);
            this.lastRegistration = new Registration(serviceName, ip, port);
        } catch (NacosException e) {
            throw new ServiceDiscoveryException("Nacos 注册失败: service=" + serviceName + ", group=" + group, e);
        }
    }

    public void deregister(String serviceName, String ip, int port) {
        try {
            namingService.deregisterInstance(serviceName, group, ip, port);
        } catch (NacosException e) {
            throw new ServiceDiscoveryException("Nacos 注销失败: service=" + serviceName + ", group=" + group, e);
        }
    }

    public void deregisterLastIfPresent() {
        Registration reg = this.lastRegistration;
        if (reg == null) {
            return;
        }
        deregister(reg.serviceName, reg.ip, reg.port);
    }

    public void shutdown() {
        try {
            namingService.shutDown();
        } catch (NacosException e) {
            throw new ServiceDiscoveryException("关闭 Nacos 连接失败", e);
        }
    }

    private record Registration(String serviceName, String ip, int port) {
    }
}
