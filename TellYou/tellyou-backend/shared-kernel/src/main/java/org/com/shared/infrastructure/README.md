# Shared-Kernel 使用指南

## 概述

`shared-kernel` 模块提供了通用的服务发现和 gRPC 客户端工具类，所有微服务都可以使用。

## 核心组件

### 1. NacosServiceDiscovery - 服务发现工具

用于从 Nacos 获取服务实例列表。

### 2. GrpcClientManager - gRPC 客户端管理器

管理 gRPC Channel 的生命周期，自动从 Nacos 获取服务实例。

### 3. GrpcClientFactory - gRPC 客户端工厂

简化 gRPC Stub 的创建过程。

## 使用示例

### 基础使用

```java
// 1. 初始化服务发现
NacosServiceDiscovery discovery = new NacosServiceDiscovery(
    "localhost:8848",  // Nacos 服务器地址
    "public",          // 命名空间
    "DEFAULT_GROUP"    // 分组
);

// 2. 创建 gRPC 客户端工厂
GrpcClientFactory factory = new GrpcClientFactory(discovery);

// 3. 创建 Stub（示例：AuthService）
AuthServiceGrpc.AuthServiceBlockingStub authStub = factory.createStub(
    "auth-service",
    channel -> AuthServiceGrpc.newBlockingStub(channel)
);

// 4. 调用服务
LoginRequest request = LoginRequest.newBuilder()
    .setEmail("user@example.com")
    .setPassword("password")
    .build();
LoginResponse response = authStub.login(request);

// 5. 关闭资源（应用关闭时）
factory.shutdown();
discovery.shutdown();
```

### Spring Boot 集成

```java
@Configuration
public class GrpcClientConfig {
    
    @Value("${nacos.server-addr:localhost:8848}")
    private String nacosServerAddr;
    
    @Value("${nacos.namespace:public}")
    private String nacosNamespace;
    
    @Bean
    public NacosServiceDiscovery nacosServiceDiscovery() throws Exception {
        return new NacosServiceDiscovery(nacosServerAddr, nacosNamespace, "DEFAULT_GROUP");
    }
    
    @Bean
    public GrpcClientFactory grpcClientFactory(NacosServiceDiscovery discovery) {
        return new GrpcClientFactory(discovery);
    }
    
    @PreDestroy
    public void destroy() {
        // Spring 会自动调用 @PreDestroy 方法
    }
}

@Service
public class AuthServiceClient {
    
    private final GrpcClientFactory grpcFactory;
    
    public AuthServiceClient(GrpcClientFactory grpcFactory) {
        this.grpcFactory = grpcFactory;
    }
    
    public LoginResponse login(String email, String password) {
        AuthServiceGrpc.AuthServiceBlockingStub stub = grpcFactory.createStub(
            "auth-service",
            channel -> AuthServiceGrpc.newBlockingStub(channel)
        );
        
        LoginRequest request = LoginRequest.newBuilder()
            .setEmail(email)
            .setPassword(password)
            .build();
        
        return stub.login(request);
    }
}
```

### 高级用法：自定义 Channel 配置

```java
// 使用 GrpcClientManager 直接管理 Channel
GrpcClientManager manager = new GrpcClientManager(discovery, false); // false = 使用 TLS

ManagedChannel channel = manager.getChannel("auth-service");
AuthServiceGrpc.AuthServiceBlockingStub stub = AuthServiceGrpc.newBlockingStub(channel);
```

### 监听服务变化

```java
// 订阅服务变化事件
discovery.subscribe("auth-service", event -> {
    if (event instanceof NamingEvent) {
        NamingEvent namingEvent = (NamingEvent) event;
        log.info("服务实例变化: {}", namingEvent.getInstances());
        // 刷新 Channel
        factory.refreshChannel("auth-service");
    }
});
```

## 配置说明

### application.yml

```yaml
nacos:
  server-addr: localhost:8848
  namespace: public
  group: DEFAULT_GROUP

grpc:
  use-plaintext: true  # 开发环境 true，生产环境 false
```

## 注意事项

1. **资源管理**：应用关闭时务必调用 `shutdown()` 方法释放资源
2. **服务注册**：确保后端服务已注册到 Nacos，并在 metadata 中设置 `grpc.port`
3. **生产环境**：生产环境应使用 TLS 加密（`usePlaintext = false`）
4. **负载均衡**：当前使用简单轮询，可根据需要扩展更复杂的负载均衡算法
