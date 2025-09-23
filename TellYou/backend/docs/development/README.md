# TellYou IM系统开发指南

## 开发环境搭建

### 1. 环境要求

- **JDK**: 21+
- **Maven**: 3.6+
- **IDE**: IntelliJ IDEA 2023.3+ 或 Eclipse 2023-03+
- **Git**: 2.30+

### 2. 依赖服务

#### 2.1 MySQL 8.0+
```bash
# 安装MySQL
# 创建数据库
CREATE DATABASE tell_you_im CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户
CREATE USER 'tellyou'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON tell_you_im.* TO 'tellyou'@'%';
FLUSH PRIVILEGES;
```

#### 2.2 MongoDB 4.4+
```bash
# 安装MongoDB
# 启动MongoDB服务
mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork

# 创建数据库
use tell_you_im
```

#### 2.3 Redis 6.0+
```bash
# 安装Redis
# 启动Redis服务
redis-server /etc/redis/redis.conf
```

#### 2.4 RocketMQ 4.9+
```bash
# 下载RocketMQ
wget https://archive.apache.org/dist/rocketmq/4.9.4/rocketmq-all-4.9.4-bin-release.zip

# 解压并启动
unzip rocketmq-all-4.9.4-bin-release.zip
cd rocketmq-all-4.9.4-bin-release

# 启动NameServer
nohup sh bin/mqnamesrv &

# 启动Broker
nohup sh bin/mqbroker -n localhost:9876 &
```

### 3. 项目配置

#### 3.1 配置文件设置

创建 `backend/starter/src/main/resources/application-dev.yml`:

```yaml
# 数据库配置
value:
  datasource:
    host: localhost
    port: 3306
    database: tell_you_im
    username: tellyou
    password: password
    driver-class-name: com.mysql.cj.jdbc.Driver
  
  # Redis配置
  redis:
    host: localhost
    port: 6379
    database: 0
    password: ""
  
  # MongoDB配置
  mongodb:
    host: localhost
    port: 27017
    database: tell_you_im
  
  # JWT配置
  jwt:
    user-secret-key: your-secret-key
    user-ttl: 7200
    user-token-name: token
    uid-key: uid
  
  # 阿里云OSS配置
  aliyun-oss:
    endpoint: your-endpoint
    access-key-id: your-access-key-id
    access-key-secret: your-access-key-secret
    bucket-name: your-bucket-name
  
  # MinIO配置
  minio:
    endpoint: http://localhost:9000
    accessKey: minioadmin
    secretKey: minioadmin
    bucket: tellyou
  
  # 邮件配置
  mail:
    username: your-email@qq.com
    password: your-email-password
  
  # 拉取配置
  pull:
    pullSize: 20
    isCompress: true
```

#### 3.2 启动项目

```bash
# 进入项目根目录
cd backend

# 编译项目
mvn clean compile

# 启动应用
cd starter
mvn spring-boot:run
```

## 开发规范

### 1. 代码规范

#### 1.1 命名规范

- **类名**: 使用大驼峰命名法，如 `UserInfoService`
- **方法名**: 使用小驼峰命名法，如 `getUserInfo`
- **变量名**: 使用小驼峰命名法，如 `userName`
- **常量名**: 使用全大写，下划线分隔，如 `MAX_RETRY_COUNT`
- **包名**: 使用小写字母，如 `org.com.modules.user`

#### 1.2 注释规范

```java
/**
 * 用户信息服务实现类
 * 
 * @author lanye
 * @date 2025-01-01
 * @description 提供用户信息的增删改查功能
 */
@Service
public class UserInfoServiceImpl implements UserInfoService {
    
    /**
     * 根据用户ID获取用户信息
     * 
     * @param userId 用户ID
     * @return 用户信息
     * @throws BusinessException 当用户不存在时抛出异常
     */
    @Override
    public UserInfo getUserById(Long userId) {
        // 实现逻辑
    }
}
```

#### 1.3 异常处理规范

```java
// 使用统一的异常处理
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ApiResult<Void> handleBusinessException(BusinessException e) {
        return ApiResult.fail(e.getCode(), e.getMessage());
    }
}

// 业务异常定义
public class BusinessException extends RuntimeException {
    private final Integer code;
    private final String message;
    
    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
        this.message = message;
    }
}
```

### 2. 接口设计规范

#### 2.1 RESTful API设计

```java
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "用户管理")
public class UserController {
    
    @GetMapping("/{id}")
    @Operation(summary = "获取用户信息")
    public ApiResult<UserInfo> getUser(@PathVariable Long id) {
        // 实现逻辑
    }
    
    @PostMapping
    @Operation(summary = "创建用户")
    public ApiResult<Void> createUser(@Valid @RequestBody CreateUserReq req) {
        // 实现逻辑
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "更新用户信息")
    public ApiResult<Void> updateUser(@PathVariable Long id, 
                                     @Valid @RequestBody UpdateUserReq req) {
        // 实现逻辑
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "删除用户")
    public ApiResult<Void> deleteUser(@PathVariable Long id) {
        // 实现逻辑
    }
}
```

#### 2.2 请求响应格式

```java
// 统一响应格式
@Data
public class ApiResult<T> {
    private Integer code;
    private String message;
    private T data;
    
    public static <T> ApiResult<T> success(T data) {
        ApiResult<T> result = new ApiResult<>();
        result.setCode(200);
        result.setMessage("success");
        result.setData(data);
        return result;
    }
    
    public static <T> ApiResult<T> fail(Integer code, String message) {
        ApiResult<T> result = new ApiResult<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
}
```

### 3. 数据库操作规范

#### 3.1 MyBatis Plus使用

```java
// DAO层
@Service
public class UserInfoDao extends ServiceImpl<UserInfoMapper, UserInfo> {
    
    public UserInfo getByEmail(String email) {
        return lambdaQuery()
            .eq(UserInfo::getEmail, email)
            .one();
    }
    
    public List<UserInfo> getActiveUsers() {
        return lambdaQuery()
            .eq(UserInfo::getStatus, 1)
            .orderByDesc(UserInfo::getCreateTime)
            .list();
    }
}
```

#### 3.2 MongoDB操作

```java
// MongoDB DAO
@Repository
public class MessageDocDao {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    public void saveMessage(MessageDoc messageDoc) {
        mongoTemplate.save(messageDoc);
    }
    
    public List<MessageDoc> getMessagesBySession(Long sessionId, int page, int size) {
        Query query = new Query(Criteria.where("sessionId").is(sessionId))
            .with(Sort.by(Sort.Direction.DESC, "createTime"))
            .skip((page - 1) * size)
            .limit(size);
        
        return mongoTemplate.find(query, MessageDoc.class);
    }
}
```

### 4. 消息队列使用规范

#### 4.1 消息生产者

```java
@Service
public class MessageProducer {
    
    @Autowired
    private RocketMQTemplate rocketMQTemplate;
    
    public void sendMessage(MessageReq messageReq) {
        String message = JSON.toJSONString(messageReq);
        rocketMQTemplate.convertAndSend(MQConstant.SESSION_TOPIC, message);
    }
}
```

#### 4.2 消息消费者

```java
@Slf4j
@Service
@RocketMQMessageListener(
    topic = MQConstant.SESSION_TOPIC,
    consumerGroup = MQConstant.SESSION_GROUP
)
public class SessionConsumer implements RocketMQListener<String> {
    
    @Override
    public void onMessage(String message) {
        try {
            MessageReq req = JSON.parseObject(message, MessageReq.class);
            // 处理消息逻辑
            processMessage(req);
        } catch (Exception e) {
            log.error("消息处理失败: {}", message, e);
            throw e; // 重新抛出异常，触发重试
        }
    }
}
```

## 测试规范

### 1. 单元测试

```java
@SpringBootTest
class UserInfoServiceTest {
    
    @Autowired
    private UserInfoService userInfoService;
    
    @Test
    void testGetUserById() {
        // Given
        Long userId = 123456789L;
        
        // When
        UserInfo userInfo = userInfoService.getUserById(userId);
        
        // Then
        assertThat(userInfo).isNotNull();
        assertThat(userInfo.getUserId()).isEqualTo(userId);
    }
    
    @Test
    void testGetUserByIdNotFound() {
        // Given
        Long userId = 999999999L;
        
        // When & Then
        assertThatThrownBy(() -> userInfoService.getUserById(userId))
            .isInstanceOf(BusinessException.class)
            .hasMessage("用户不存在");
    }
}
```

### 2. 集成测试

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserControllerIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void testGetUser() {
        // Given
        Long userId = 123456789L;
        
        // When
        ResponseEntity<ApiResult> response = restTemplate.getForEntity(
            "/api/v1/users/" + userId, ApiResult.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getCode()).isEqualTo(200);
    }
}
```

## 性能优化

### 1. 数据库优化

#### 1.1 索引优化

```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_user_email ON user_info(email);
CREATE INDEX idx_user_status ON user_info(status);
CREATE INDEX idx_session_type ON session(session_type);
CREATE INDEX idx_message_session_time ON message(session_id, send_time);
```

#### 1.2 查询优化

```java
// 使用分页查询
public Page<UserInfo> getUsers(int page, int size) {
    return lambdaQuery()
        .eq(UserInfo::getStatus, 1)
        .orderByDesc(UserInfo::getCreateTime)
        .page(new Page<>(page, size));
}

// 使用批量操作
public void batchUpdateUsers(List<UserInfo> users) {
    updateBatchById(users);
}
```

### 2. 缓存优化

#### 2.1 Redis缓存

```java
@Service
public class UserInfoService {
    
    @Cacheable(value = "user", key = "#userId")
    public UserInfo getUserById(Long userId) {
        return userInfoDao.getById(userId);
    }
    
    @CacheEvict(value = "user", key = "#user.userId")
    public void updateUser(UserInfo user) {
        userInfoDao.updateById(user);
    }
}
```

#### 2.2 本地缓存

```java
@Component
public class LocalCacheManager {
    
    private final Cache<String, Object> cache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build();
    
    public <T> T get(String key, Class<T> type) {
        return (T) cache.getIfPresent(key);
    }
    
    public void put(String key, Object value) {
        cache.put(key, value);
    }
}
```

### 3. 异步处理

```java
@Service
public class MessageService {
    
    @Async
    public CompletableFuture<Void> sendMessageAsync(MessageReq messageReq) {
        // 异步发送消息
        return CompletableFuture.completedFuture(null);
    }
    
    @EventListener
    @Async
    public void handleMessageEvent(MessageSendEvent event) {
        // 异步处理消息事件
    }
}
```

## 部署指南

### 1. 开发环境部署

```bash
# 使用Docker Compose启动依赖服务
docker-compose -f docker-compose.dev.yml up -d

# 启动应用
mvn spring-boot:run -Dspring.profiles.active=dev
```

### 2. 生产环境部署

```bash
# 打包应用
mvn clean package -DskipTests

# 构建Docker镜像
docker build -t tellyou-im:latest .

# 启动应用
docker run -d --name tellyou-im \
  -p 8081:8081 \
  -p 8082:8082 \
  -e SPRING_PROFILES_ACTIVE=prod \
  tellyou-im:latest
```

## 监控与日志

### 1. 日志配置

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>./logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>./logs/application.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>100MB</maxFileSize>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="STDOUT" />
        <appender-ref ref="FILE" />
    </root>
</configuration>
```

### 2. 监控配置

```java
// 添加监控端点
@Configuration
@EnableWebMvc
public class MonitoringConfig {
    
    @Bean
    public MeterRegistry meterRegistry() {
        return new SimpleMeterRegistry();
    }
}
```

## 常见问题

### 1. 开发环境问题

**Q: 启动时提示数据库连接失败**
A: 检查MySQL服务是否启动，数据库配置是否正确

**Q: RocketMQ连接失败**
A: 检查RocketMQ服务是否启动，NameServer地址是否正确

**Q: MongoDB连接失败**
A: 检查MongoDB服务是否启动，连接字符串是否正确

### 2. 性能问题

**Q: 接口响应慢**
A: 检查数据库查询是否使用了索引，是否有慢查询

**Q: 内存占用过高**
A: 检查是否有内存泄漏，调整JVM参数

**Q: 消息处理延迟**
A: 检查RocketMQ消费者配置，增加消费者实例

### 3. 部署问题

**Q: Docker容器启动失败**
A: 检查Docker镜像是否正确构建，环境变量是否配置

**Q: 生产环境配置问题**
A: 检查配置文件是否正确，依赖服务是否可用

