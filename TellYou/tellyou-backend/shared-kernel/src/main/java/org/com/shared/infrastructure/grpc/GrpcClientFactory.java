package org.com.shared.infrastructure.grpc;

import io.grpc.ManagedChannel;
import lombok.extern.slf4j.Slf4j;
import org.com.shared.infrastructure.nacos.NacosServiceDiscovery;

/**
 * gRPC 客户端工厂（简化各服务的使用）
 *
 * @author lanye
 */
@Slf4j
public class GrpcClientFactory {

    private final GrpcClientManager clientManager;

    /**
     * 构造函数
     *
     * @param serviceDiscovery Nacos 服务发现实例
     */
    public GrpcClientFactory(NacosServiceDiscovery serviceDiscovery) {
        this.clientManager = new GrpcClientManager(serviceDiscovery);
    }

    /**
     * 构造函数（指定是否使用明文传输）
     *
     * @param serviceDiscovery Nacos 服务发现实例
     * @param usePlaintext 是否使用明文传输
     */
    public GrpcClientFactory(NacosServiceDiscovery serviceDiscovery, boolean usePlaintext) {
        this.clientManager = new GrpcClientManager(serviceDiscovery, usePlaintext);
    }

    /**
     * 创建 gRPC Stub（泛型方法，各服务可以创建自己的 Stub）
     *
     * @param serviceName 服务名称
     * @param factory Stub 工厂函数
     * @param <T> Stub 类型
     * @return gRPC Stub 实例
     */
    public <T> T createStub(String serviceName, StubFactory<T> factory) {
        ManagedChannel channel = clientManager.getChannel(serviceName);
        return factory.create(channel);
    }

    /**
     * 获取底层 Channel（用于需要直接操作 Channel 的场景）
     *
     * @param serviceName 服务名称
     * @return ManagedChannel
     */
    public ManagedChannel getChannel(String serviceName) {
        return clientManager.getChannel(serviceName);
    }

    /**
     * 刷新服务 Channel
     *
     * @param serviceName 服务名称
     */
    public void refreshChannel(String serviceName) {
        clientManager.refreshChannel(serviceName);
    }

    /**
     * Stub 工厂函数式接口
     *
     * @param <T> Stub 类型
     */
    @FunctionalInterface
    public interface StubFactory<T> {
        /**
         * 从 Channel 创建 Stub
         *
         * @param channel gRPC Channel
         * @return Stub 实例
         */
        T create(ManagedChannel channel);
    }

    /**
     * 关闭工厂并释放资源
     */
    public void shutdown() {
        clientManager.shutdown();
        log.info("gRPC 客户端工厂已关闭");
    }
}
