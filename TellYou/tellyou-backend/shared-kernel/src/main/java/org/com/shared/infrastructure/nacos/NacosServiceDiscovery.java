package org.com.shared.infrastructure.nacos;

import com.alibaba.nacos.api.NacosFactory;
import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingService;
import com.alibaba.nacos.api.naming.listener.NamingEvent;
import com.alibaba.nacos.api.naming.pojo.Instance;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Objects;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Nacos 服务发现工具类（通用，所有服务都可以使用）
 *
 * @author lanye
 */
@Slf4j
public class NacosServiceDiscovery {

    private final NamingService namingService;
    private final String group;
    private final ConcurrentHashMap<String, List<Instance>> serviceCache = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final long refreshIntervalSeconds;

    /**
     * 构造函数
     *
     * @param serverAddr Nacos 服务器地址，格式：host:port
     * @param namespace 命名空间
     * @param group 分组名称
     * @param refreshIntervalSeconds 服务列表刷新间隔（秒）
     * @throws NacosException 初始化失败时抛出
     */
    public NacosServiceDiscovery(String serverAddr, String namespace, String group, long refreshIntervalSeconds) throws NacosException {
        Properties properties = new Properties();
        properties.put("serverAddr", serverAddr);
        properties.put("namespace", namespace);
        this.namingService = NacosFactory.createNamingService(properties);
        this.group = group;
        this.refreshIntervalSeconds = refreshIntervalSeconds;

        // 启动定时刷新服务列表
        scheduler.scheduleAtFixedRate(this::refreshAllServices, refreshIntervalSeconds, refreshIntervalSeconds, TimeUnit.SECONDS);

        log.info("Nacos 服务发现初始化完成: serverAddr={}, namespace={}, group={}", serverAddr, namespace, group);
    }

    /**
     * 简化构造函数，使用默认刷新间隔 10 秒
     */
    public NacosServiceDiscovery(String serverAddr, String namespace, String group) throws NacosException {
        this(serverAddr, namespace, group, 10);
    }

    /**
     * 获取服务实例列表
     *
     * @param serviceName 服务名称
     * @return 服务实例列表
     */
    public List<Instance> getInstances(String serviceName) {
        return serviceCache.computeIfAbsent(serviceName, name -> {
            try {
                List<Instance> instances = namingService.getAllInstances(name, group);
                log.debug("获取服务实例: {} -> {} 个实例", name, instances.size());
                return instances;
            } catch (NacosException e) {
                log.error("获取服务实例失败: {}", name, e);
                return List.of();
            }
        });
    }

    /**
     * 选择一个健康的实例（简单轮询负载均衡）
     *
     * @param serviceName 服务名称
     * @return 选中的服务实例
     * @throws RuntimeException 如果没有可用的健康实例
     */
    public Instance selectInstance(String serviceName) {
        List<Instance> instances = getInstances(serviceName);
        List<Instance> healthyInstances = instances.stream()
            .filter(Instance::isHealthy)
            .filter(Instance::isEnabled)
            .toList();

        if (healthyInstances.isEmpty()) {
            throw new RuntimeException("服务不可用: " + serviceName + " (没有健康的实例)");
        }

        // 简单轮询（实际可以用更复杂的负载均衡算法）
        int index = (int) (System.currentTimeMillis() % healthyInstances.size());
        Instance selected = healthyInstances.get(index);
        log.debug("选择服务实例: {} -> {}:{}", serviceName, selected.getIp(), selected.getPort());
        return selected;
    }

    /**
     * 刷新指定服务的实例列表
     *
     * @param serviceName 服务名称
     */
    public void refreshService(String serviceName) {
        serviceCache.remove(serviceName);
        getInstances(serviceName);
        log.debug("刷新服务实例: {}", serviceName);
    }

    /**
     * 刷新所有服务的实例列表
     */
    private void refreshAllServices() {
        serviceCache.keySet().forEach(serviceName -> {
            try {
                List<Instance> instances = namingService.getAllInstances(serviceName, group);
                serviceCache.put(serviceName, instances);
            } catch (NacosException e) {
                log.warn("刷新服务实例失败: {}", serviceName, e);
            }
        });
    }

    /**
     * 订阅服务变化（可选功能）
     *
     * @param serviceName 服务名称
     * @param listener 监听器
     */
    public void subscribe(String serviceName, com.alibaba.nacos.api.naming.listener.EventListener listener) throws NacosException {
        namingService.subscribe(serviceName, group, listener);
    }

    public List<Instance> subscribeAndCache(String serviceName, Consumer<List<Instance>> onChange) throws NacosException {
        Objects.requireNonNull(serviceName, "serviceName");

        List<Instance> initial = namingService.getAllInstances(serviceName, group);
        serviceCache.put(serviceName, initial);

        namingService.subscribe(serviceName, group, event -> {
            if (!(event instanceof NamingEvent namingEvent)) {
                return;
            }

            List<Instance> instances = namingEvent.getInstances();
            serviceCache.put(serviceName, instances);

            if (onChange == null) {
                return;
            }
            try {
                onChange.accept(instances);
            } catch (Exception e) {
                log.warn("Nacos 订阅回调执行失败: service={}", serviceName, e);
            }
        });

        return initial;
    }

    /**
     * 关闭服务发现，释放资源
     */
    public void shutdown() {
        scheduler.shutdown();
        try {
            if (namingService != null) {
                namingService.shutDown();
            }
            log.info("Nacos 服务发现已关闭");
        } catch (NacosException e) {
            log.error("关闭 Nacos 连接失败", e);
        }
    }
}
