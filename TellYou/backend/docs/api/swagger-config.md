# TellYou IM系统 Swagger配置文档

## Swagger配置概览

TellYou IM系统使用Knife4j作为API文档工具，基于OpenAPI 3.0规范，提供完整的API文档和在线测试功能。

## 配置信息

### 1. 基础配置

```java
@Configuration
@EnableKnife4j
@EnableOpenApi
public class SwaggerConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("TellYou IM系统API文档")
                .version("1.0.0")
                .description("TellYou即时通讯系统后端API接口文档")
                .contact(new Contact()
                    .name("开发团队")
                    .email("dev@tellyou.com")
                    .url("https://www.tellyou.com"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(Arrays.asList(
                new Server().url("http://localhost:8081").description("开发环境"),
                new Server().url("https://api.tellyou.com").description("生产环境")
            ))
            .components(new Components()
                .addSecuritySchemes("Bearer Token", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT Token认证"))
                .addSchemas("ApiResult", new Schema<>()
                    .type("object")
                    .addProperty("code", new Schema<>().type("integer").description("响应码"))
                    .addProperty("message", new Schema<>().type("string").description("响应消息"))
                    .addProperty("data", new Schema<>().description("响应数据"))));
    }
}
```

### 2. 全局配置

```yaml
# application.yml
knife4j:
  enable: true
  openapi:
    title: TellYou IM系统API文档
    description: TellYou即时通讯系统后端API接口文档
    version: 1.0.0
    concat: dev@tellyou.com
  setting:
    language: zh_cn
    enable-version: true
    enable-reload-cache-parameter: true
    enable-after-script: true
    enable-filter-multipart-api-method-type: POST
    enable-filter-multipart-apis: true
    enable-request-cache: true
    enable-host-text: 请选择服务器地址
    enable-home-custom: true
    home-custom-path: classpath:markdown/home.md
  production: false
  basic:
    enable: false
```

## API分组配置

### 1. 用户管理API组

```java
@Tag(name = "用户管理", description = "用户注册、登录、信息管理相关接口")
@RestController
@RequestMapping("/userAccount")
public class AccountController {
    
    @Operation(summary = "用户注册", description = "用户通过邮箱注册账号")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "注册成功"),
        @ApiResponse(responseCode = "400", description = "参数错误"),
        @ApiResponse(responseCode = "409", description = "邮箱已存在")
    })
    @PostMapping("/register")
    public ApiResult<Void> register(@Valid @RequestBody RegisterReq req) {
        // 实现逻辑
    }
    
    @Operation(summary = "用户登录", description = "用户通过邮箱和密码登录")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "登录成功", 
                    content = @Content(schema = @Schema(implementation = LoginResp.class))),
        @ApiResponse(responseCode = "401", description = "用户名或密码错误")
    })
    @PostMapping("/login")
    public ApiResult<LoginResp> login(@Valid @RequestBody LoginReq req) {
        // 实现逻辑
    }
}
```

### 2. 会话管理API组

```java
@Tag(name = "会话管理", description = "会话创建、管理、群组操作相关接口")
@RestController
@RequestMapping("/session")
public class SessionController {
    
    @Operation(summary = "创建会话", description = "创建新的聊天会话")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "创建成功"),
        @ApiResponse(responseCode = "400", description = "参数错误")
    })
    @PostMapping("/create")
    public ApiResult<SessionVo> createSession(@Valid @RequestBody CreateSessionReq req) {
        // 实现逻辑
    }
    
    @Operation(summary = "获取会话列表", description = "获取用户的会话列表")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "获取成功",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = SessionVo.class))))
    })
    @GetMapping("/list")
    public ApiResult<List<SessionVo>> getSessionList(
            @Parameter(description = "页码", example = "1") @RequestParam(defaultValue = "1") Integer page,
            @Parameter(description = "每页大小", example = "20") @RequestParam(defaultValue = "20") Integer size) {
        // 实现逻辑
    }
}
```

### 3. 消息管理API组

```java
@Tag(name = "消息管理", description = "消息发送、接收、历史记录相关接口")
@RestController
@RequestMapping("/message")
public class MessageController {
    
    @Operation(summary = "发送消息", description = "发送文本、图片、语音等消息")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "发送成功"),
        @ApiResponse(responseCode = "400", description = "参数错误"),
        @ApiResponse(responseCode = "401", description = "未授权")
    })
    @PostMapping("/send")
    public ApiResult<Void> sendMessage(@Valid @RequestBody SendMessageReq req) {
        // 实现逻辑
    }
    
    @Operation(summary = "获取历史消息", description = "获取会话的历史消息记录")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "获取成功",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = MessageVo.class))))
    })
    @GetMapping("/history")
    public ApiResult<List<MessageVo>> getHistoryMessages(
            @Parameter(description = "会话ID", required = true) @RequestParam Long sessionId,
            @Parameter(description = "最后一条消息ID", example = "0") @RequestParam(defaultValue = "0") Long lastMessageId,
            @Parameter(description = "每页大小", example = "20") @RequestParam(defaultValue = "20") Integer size) {
        // 实现逻辑
    }
}
```

## 请求响应模型

### 1. 通用响应模型

```java
@Schema(description = "统一响应格式")
public class ApiResult<T> {
    
    @Schema(description = "响应码", example = "200")
    private Integer code;
    
    @Schema(description = "响应消息", example = "success")
    private String message;
    
    @Schema(description = "响应数据")
    private T data;
    
    // 构造方法和静态方法
}
```

### 2. 请求模型示例

```java
@Schema(description = "用户注册请求")
public class RegisterReq {
    
    @Schema(description = "邮箱地址", example = "user@example.com", required = true)
    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @Schema(description = "密码", example = "password123", required = true)
    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 20, message = "密码长度必须在6-20位之间")
    private String password;
    
    @Schema(description = "昵称", example = "用户昵称", required = true)
    @NotBlank(message = "昵称不能为空")
    @Size(max = 20, message = "昵称长度不能超过20位")
    private String nickName;
    
    @Schema(description = "验证码", example = "123456", required = true)
    @NotBlank(message = "验证码不能为空")
    @Size(min = 6, max = 6, message = "验证码必须是6位数字")
    private String code;
}
```

### 3. 响应模型示例

```java
@Schema(description = "用户登录响应")
public class LoginResp {
    
    @Schema(description = "用户ID", example = "123456789")
    private Long uid;
    
    @Schema(description = "用户昵称", example = "用户昵称")
    private String nickName;
    
    @Schema(description = "用户头像", example = "https://example.com/avatar.jpg")
    private String avatar;
    
    @Schema(description = "JWT Token", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
    private String token;
    
    @Schema(description = "Token过期时间", example = "2025-01-01T12:00:00Z")
    private LocalDateTime expireTime;
}
```

## 认证配置

### 1. JWT认证配置

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/userAccount/register", "/userAccount/login", "/userAccount/getCheckCode").permitAll()
                .requestMatchers("/doc.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

### 2. Swagger认证配置

```java
@Configuration
public class SwaggerSecurityConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .addSecurityItem(new SecurityRequirement().addList("Bearer Token"))
            .components(new Components()
                .addSecuritySchemes("Bearer Token", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT Token认证，格式：Bearer {token}")
                    .in(SecurityScheme.In.HEADER)
                    .name("Authorization")));
    }
}
```

## 接口文档访问

### 1. 访问地址

- **开发环境**: http://localhost:8081/doc.html
- **生产环境**: https://api.tellyou.com/doc.html

### 2. 功能特性

- **在线测试**: 支持直接在文档中测试API接口
- **参数验证**: 自动验证请求参数格式
- **响应预览**: 实时预览API响应结果
- **认证支持**: 支持JWT Token认证
- **导出功能**: 支持导出API文档为PDF、Word等格式

### 3. 使用说明

1. **查看API文档**: 访问doc.html页面，浏览所有API接口
2. **在线测试**: 点击接口名称，在右侧面板中填写参数并测试
3. **认证设置**: 在页面右上角设置JWT Token进行认证
4. **参数说明**: 查看每个参数的详细说明和示例
5. **响应示例**: 查看接口的响应格式和示例数据

## 自定义配置

### 1. 自定义首页

```markdown
# 在 resources/markdown/home.md 中自定义首页内容

# TellYou IM系统API文档

欢迎使用TellYou IM系统API文档！

## 快速开始

1. 用户注册：POST /userAccount/register
2. 用户登录：POST /userAccount/login
3. 发送消息：POST /message/send
4. 获取历史消息：GET /message/history

## 认证说明

所有需要认证的接口都需要在请求头中携带JWT Token：

```
Authorization: Bearer {your_jwt_token}
```

## 联系方式

如有问题，请联系开发团队：dev@tellyou.com
```

### 2. 自定义主题

```yaml
# application.yml
knife4j:
  setting:
    enable-home-custom: true
    home-custom-path: classpath:markdown/home.md
    enable-swagger-models: true
    swagger-model-name: 实体类列表
    enable-document-manage: true
    enable-search: true
    enable-footer: true
    enable-footer-custom: true
    footer-custom-content: Copyright © 2025 TellYou IM System
```

### 3. 接口分组管理

```java
@Configuration
public class ApiGroupConfig {
    
    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
            .group("用户管理")
            .pathsToMatch("/userAccount/**", "/userInfo/**")
            .build();
    }
    
    @Bean
    public GroupedOpenApi sessionApi() {
        return GroupedOpenApi.builder()
            .group("会话管理")
            .pathsToMatch("/session/**", "/group/**")
            .build();
    }
    
    @Bean
    public GroupedOpenApi messageApi() {
        return GroupedOpenApi.builder()
            .group("消息管理")
            .pathsToMatch("/message/**")
            .build();
    }
}
```

## 最佳实践

### 1. 接口文档规范

- 每个接口都要有清晰的描述和示例
- 参数验证规则要完整
- 响应格式要统一
- 错误码要明确

### 2. 版本管理

- 使用URL路径进行版本控制
- 保持向后兼容性
- 废弃的接口要标记为deprecated

### 3. 安全考虑

- 敏感信息不要暴露在文档中
- 生产环境要限制文档访问
- 定期更新API文档

### 4. 性能优化

- 大文件上传要设置合理的超时时间
- 分页查询要设置合理的默认值
- 缓存策略要明确说明

