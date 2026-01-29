package org.com.shared.infrastructure.grpc;

import com.alibaba.nacos.api.naming.pojo.Instance;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.infrastructure.nacos.NacosServiceDiscovery;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * gRPC 客户端管理器（通用，所有服务都可以使用）
 *
 * @author lanye
 */
@Slf4j
public class GrpcClientManager {

    private final NacosServiceDiscovery serviceDiscovery;
    private final Map<String, ManagedChannel> channelCache = new ConcurrentHashMap<>();
    private final boolean usePlaintext;

    /**
     * 构造函数
     *
     * @param serviceDiscovery Nacos 服务发现实例
     * @param usePlaintext 是否使用明文传输（开发环境 true，生产环境 false）
     */
    public GrpcClientManager(NacosServiceDiscovery serviceDiscovery, boolean usePlaintext) {
        this.serviceDiscovery = serviceDiscovery;
        this.usePlaintext = usePlaintext;
    }

    /**
     * 简化构造函数，默认使用明文传输（开发环境）
     */
    public GrpcClientManager(NacosServiceDiscovery serviceDiscovery) {
        this(serviceDiscovery, true);
    }

    /**
     * 获取 gRPC Channel（带服务发现和缓存）
     *
     * @param serviceName 服务名称
     * @return gRPC ManagedChannel
     */
    public ManagedChannel getChannel(String serviceName) {
        return channelCache.computeIfAbsent(serviceName, name -> {
            Instance instance = serviceDiscovery.selectInstance(name);

            // 从 metadata 获取 gRPC 端口，如果没有则使用默认端口 9090
            String grpcPort = instance.getMetadata().getOrDefault("grpc.port", "9090");
            int port = Integer.parseInt(grpcPort);

            log.info("创建 gRPC Channel: {} -> {}:{}", name, instance.getIp(), port);

            ManagedChannelBuilder<?> builder = ManagedChannelBuilder.forAddress(instance.getIp(), port);

            if (usePlaintext) {
                builder.usePlaintext();
            }
            // 生产环境应该配置 TLS
            // else {
            //     builder.useTransportSecurity();
            // }

            // 配置超时和重试
            ManagedChannel channel = builder
                .keepAliveTime(30, TimeUnit.SECONDS)
                .keepAliveTimeout(5, TimeUnit.SECONDS)
                .keepAliveWithoutCalls(true)
                .build();

            return channel;
        });
    }

    /**
     * 获取指定服务实例的 Channel（用于需要指定特定实例的场景）
     *
     * @param serviceName 服务名称
     * @param instance 服务实例
     * @return gRPC ManagedChannel
     */
    public ManagedChannel getChannel(String serviceName, Instance instance) {
        String key = serviceName + ":" + instance.getIp() + ":" + instance.getPort();
        return channelCache.computeIfAbsent(key, k -> {
            String grpcPort = instance.getMetadata().getOrDefault("grpc.port", "9090");
            int port = Integer.parseInt(grpcPort);

            log.info("创建 gRPC Channel (指定实例): {} -> {}:{}", serviceName, instance.getIp(), port);

            ManagedChannelBuilder<?> builder = ManagedChannelBuilder.forAddress(instance.getIp(), port);

            if (usePlaintext) {
                builder.usePlaintext();
            }

            return builder
                .keepAliveTime(30, TimeUnit.SECONDS)
                .keepAliveTimeout(5, TimeUnit.SECONDS)
                .keepAliveWithoutCalls(true)
                .build();
        });
    }

    /**
     * 移除并关闭指定服务的 Channel
     *
     * @param serviceName 服务名称
     */
    public void removeChannel(String serviceName) {
        ManagedChannel channel = channelCache.remove(serviceName);
        if (channel != null && !channel.isShutdown()) {
            channel.shutdown();
            log.info("关闭 gRPC Channel: {}", serviceName);
        }
    }

    /**
     * 刷新服务 Channel（当服务实例变化时调用）
     *
     * @param serviceName 服务名称
     */
    public void refreshChannel(String serviceName) {
        removeChannel(serviceName);
        // 下次调用 getChannel 时会自动创建新的
        log.info("刷新 gRPC Channel: {}", serviceName);
    }

    /**
     * 关闭所有 Channel 并释放资源
     */
    public void shutdown() {
        channelCache.values().forEach(channel -> {
            if (!channel.isShutdown()) {
                try {
                    channel.shutdown();
                    if (!channel.awaitTermination(5, TimeUnit.SECONDS)) {
                        channel.shutdownNow();
                    }
                } catch (InterruptedException e) {
                    channel.shutdownNow();
                    Thread.currentThread().interrupt();
                }
            }
        });
        channelCache.clear();
        log.info("gRPC 客户端管理器已关闭");
    }
}
