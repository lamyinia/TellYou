# TellYou IM系统后端开发文档

## 项目概述

TellYou是一个基于Spring Boot 3.5.0和Java 21的即时通讯(IM)系统后端项目。系统采用微服务架构，支持私聊、群聊、文件传输等核心功能。

## 技术栈

### 核心框架
- **Spring Boot**: 3.5.0
- **Java**: 21
- **Maven**: 多模块项目管理

### 数据存储
- **MySQL**: 关系型数据库，存储用户信息、会话信息等结构化数据
- **MongoDB**: 文档数据库，存储消息内容、用户信箱等非结构化数据
- **Redis**: 缓存数据库，用于会话管理、验证码存储等

### 消息队列
- **RocketMQ**: 分布式消息队列，处理消息的异步投递和消费

### 网络通信
- **Netty**: 高性能网络通信框架，实现WebSocket长连接

### 其他组件
- **MyBatis Plus**: ORM框架
- **JWT**: 用户认证
- **Swagger/Knife4j**: API文档
- **MinIO**: 对象存储
- **阿里云OSS**: 云存储
- **Seata**: 分布式事务

## 项目结构

```
backend/
├── docs/                    # 项目文档
├── modules/                 # 业务模块
│   ├── common/             # 公共组件
│   ├── user/               # 用户管理模块
│   └── session/            # 会话管理模块
├── starter/                # 启动模块
├── tools/                  # 工具模块
└── pom.xml                 # 父级POM文件
```

## 快速开始

### 环境要求
- JDK 21+
- Maven 3.6+
- MySQL 8.0+
- MongoDB 4.4+
- Redis 6.0+
- RocketMQ 4.9+

### 启动步骤
1. 配置数据库连接信息
2. 启动依赖服务(MySQL、MongoDB、Redis、RocketMQ)
3. 运行 `StarterApplication` 主类

## 文档导航

- [架构设计](./architecture/overview.md) - 系统整体架构设计
- [API接口文档](./api/README.md) - RESTful API接口说明
- [数据库设计](./database/README.md) - 数据库表结构设计
- [开发指南](./development/README.md) - 开发规范和最佳实践
- [部署指南](./deployment/README.md) - 生产环境部署说明

## 联系方式

如有问题，请联系开发团队。

