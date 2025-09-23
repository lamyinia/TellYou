# TellYou IM系统数据库设计文档

## 数据库架构概览

TellYou IM系统采用混合数据库架构，结合关系型数据库和非关系型数据库的优势：

- **MySQL**: 存储结构化数据（用户信息、会话信息、关系数据等）
- **MongoDB**: 存储非结构化数据（消息内容、用户信箱、会话文档等）
- **Redis**: 缓存和会话管理

## MySQL数据库设计

### 1. 用户管理相关表

#### 1.1 用户信息表 (user_info)

```sql
CREATE TABLE `user_info` (
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `email` varchar(50) DEFAULT NULL COMMENT '邮箱',
  `nick_name` varchar(20) DEFAULT NULL COMMENT '昵称',
  `avatar` varchar(255) DEFAULT NULL COMMENT '用户头像',
  `sex` int DEFAULT NULL COMMENT '性别 0:女 1:男',
  `password` varchar(80) DEFAULT NULL COMMENT '密码',
  `personal_signature` varchar(50) DEFAULT NULL COMMENT '个性签名',
  `status` int NOT NULL COMMENT '状态 1正常 0封号',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `last_login_time` datetime NOT NULL COMMENT '最后登录时间',
  `area_name` varchar(50) DEFAULT NULL COMMENT '地区',
  `area_code` varchar(50) DEFAULT NULL COMMENT '地区编号',
  `identifier` json DEFAULT NULL COMMENT 'ip信息',
  `last_off_time` datetime NOT NULL COMMENT '最后离开时间',
  `residues` json NOT NULL COMMENT '剩余改名、改性别、改签名、改头像次数',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_email` (`email`),
  KEY `idx_nick_name` (`nick_name`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户信息表';
```

**字段说明**：
- `user_id`: 用户唯一标识，使用雪花算法生成
- `email`: 用户邮箱，用于登录和找回密码
- `nick_name`: 用户昵称，支持修改
- `avatar`: 用户头像URL
- `sex`: 性别标识
- `password`: 加密后的密码
- `personal_signature`: 个人签名
- `status`: 用户状态，1-正常，0-封号
- `residues`: JSON格式存储各种修改次数限制

#### 1.2 好友联系人表 (friend_contact)

```sql
CREATE TABLE `friend_contact` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `from_id` bigint NOT NULL COMMENT '发起者ID',
  `to_id` bigint NOT NULL COMMENT '接收者ID',
  `status` int NOT NULL COMMENT '状态 0待确认 1已确认 2已拒绝',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_from_to` (`from_id`, `to_id`),
  KEY `idx_from_id` (`from_id`),
  KEY `idx_to_id` (`to_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友联系人表';
```

#### 1.3 好友申请表 (contact_apply)

```sql
CREATE TABLE `contact_apply` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `from_id` bigint NOT NULL COMMENT '申请者ID',
  `to_id` bigint NOT NULL COMMENT '被申请者ID',
  `apply_reason` varchar(100) DEFAULT NULL COMMENT '申请理由',
  `status` int NOT NULL COMMENT '状态 0待处理 1已同意 2已拒绝',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_from_id` (`from_id`),
  KEY `idx_to_id` (`to_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='好友申请表';
```

#### 1.4 黑名单表 (black)

```sql
CREATE TABLE `black` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `from_id` bigint NOT NULL COMMENT '黑名单发起者ID',
  `type` int NOT NULL COMMENT '黑名单发起者类型 0=uid 1=gid',
  `target` bigint NOT NULL COMMENT '拉黑目标',
  `black_version` int NOT NULL COMMENT '第几次拉黑',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '修改时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_from_target` (`from_id`, `target`),
  KEY `idx_from_id` (`from_id`),
  KEY `idx_target` (`target`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='黑名单表';
```

### 2. 会话管理相关表

#### 2.1 会话表 (session)

```sql
CREATE TABLE `session` (
  `session_id` bigint NOT NULL COMMENT '会话ID（雪花算法）',
  `session_type` int NOT NULL COMMENT '会话类型：1单聊 2群聊 3系统',
  `last_msg_id` bigint DEFAULT NULL COMMENT '最后一条消息ID',
  `last_msg_content` varchar(500) DEFAULT NULL COMMENT '最后消息摘要',
  `last_msg_time` datetime DEFAULT NULL COMMENT '最后消息时间（毫秒精度）',
  `version` int NOT NULL DEFAULT '0' COMMENT '乐观锁版本',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `ext_json` json DEFAULT NULL COMMENT '额外信息（根据不同类型房间有不同存储的东西）',
  PRIMARY KEY (`session_id`),
  KEY `idx_session_type` (`session_type`),
  KEY `idx_last_msg_time` (`last_msg_time`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话表';
```

#### 2.2 群组信息表 (group_info)

```sql
CREATE TABLE `group_info` (
  `group_id` bigint NOT NULL COMMENT '群组ID',
  `group_name` varchar(50) NOT NULL COMMENT '群组名称',
  `description` varchar(200) DEFAULT NULL COMMENT '群组描述',
  `avatar` varchar(255) DEFAULT NULL COMMENT '群组头像',
  `owner_id` bigint NOT NULL COMMENT '群主ID',
  `member_count` int NOT NULL DEFAULT '0' COMMENT '成员数量',
  `max_member_count` int NOT NULL DEFAULT '500' COMMENT '最大成员数量',
  `status` int NOT NULL DEFAULT '1' COMMENT '状态 1正常 0解散',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime NOT NULL COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`group_id`),
  KEY `idx_owner_id` (`owner_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组信息表';
```

#### 2.3 群组联系人表 (group_contact)

```sql
CREATE TABLE `group_contact` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `group_id` bigint NOT NULL COMMENT '群组ID',
  `uid` bigint NOT NULL COMMENT '用户ID',
  `role` int NOT NULL DEFAULT '0' COMMENT '角色 0普通成员 1管理员 2群主',
  `join_time` datetime NOT NULL COMMENT '加入时间',
  `last_read_time` datetime DEFAULT NULL COMMENT '最后阅读时间',
  `is_deleted` int NOT NULL DEFAULT '0' COMMENT '软删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_uid` (`group_id`, `uid`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_uid` (`uid`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组联系人表';
```

### 3. 消息相关表

#### 3.1 消息表 (message)

```sql
CREATE TABLE `message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `session_id` bigint NOT NULL COMMENT '会话ID',
  `sequence_id` bigint NOT NULL COMMENT '会话内自增ID',
  `sender_id` bigint NOT NULL COMMENT '发送者ID',
  `adjusted_timestamp` varchar(50) NOT NULL COMMENT '时序性ID',
  `msg_type` int NOT NULL COMMENT '消息类型：1文本 2图片 3语音 4视频 5文件 6红包',
  `is_recalled` int NOT NULL DEFAULT '0' COMMENT '是否撤回',
  `text` varchar(1000) DEFAULT NULL COMMENT '基本展示内容',
  `ext_json` json DEFAULT NULL COMMENT '额外信息',
  `send_time` datetime NOT NULL COMMENT '发送时间（毫秒精度）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_sequence` (`session_id`, `sequence_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';
```

## MongoDB数据库设计

### 1. 消息内容集合 (message_content)

```javascript
{
  "_id": ObjectId,
  "messageId": "消息唯一标识",
  "sessionId": NumberLong, // 会话ID
  "sequenceNumber": NumberLong, // 会话内序列号
  "clientMessageId": "客户端消息ID",
  "messageType": NumberInt, // 消息类型
  "senderId": NumberLong, // 发送者ID
  "content": "消息内容",
  "clientTimestamp": NumberLong, // 客户端时间戳
  "adjustedTimestamp": "调整后的时间戳",
  "isRecalled": Boolean, // 是否撤回
  "recallTime": NumberLong, // 撤回时间
  "status": NumberInt, // 消息状态
  "createTime": NumberLong, // 创建时间
  "updateTime": NumberLong, // 更新时间
  "extJson": {} // 扩展信息
}
```

**索引设计**：
```javascript
// 复合索引
db.message_content.createIndex({"sessionId": 1, "sequenceNumber": 1})
db.message_content.createIndex({"sessionId": 1, "clientTimestamp": 1})
db.message_content.createIndex({"senderId": 1, "clientTimestamp": 1})
db.message_content.createIndex({"messageType": 1, "clientTimestamp": 1})

// 单字段索引
db.message_content.createIndex({"messageId": 1})
db.message_content.createIndex({"clientMessageId": 1})
```

### 2. 用户信箱集合 (user_inbox)

```javascript
{
  "_id": ObjectId,
  "userId": NumberLong, // 用户ID
  "sessionId": NumberLong, // 会话ID
  "messageId": "消息ID",
  "status": NumberInt, // 消息状态：0-未读 1-已读 2-已确认
  "readTime": NumberLong, // 阅读时间
  "ackTime": NumberLong, // 确认时间
  "createTime": NumberLong, // 创建时间
  "updateTime": NumberLong // 更新时间
}
```

**索引设计**：
```javascript
// 复合索引
db.user_inbox.createIndex({"userId": 1, "sessionId": 1, "createTime": -1})
db.user_inbox.createIndex({"userId": 1, "status": 1})
db.user_inbox.createIndex({"sessionId": 1, "messageId": 1})

// 单字段索引
db.user_inbox.createIndex({"userId": 1})
db.user_inbox.createIndex({"messageId": 1})
```

### 3. 会话文档集合 (session_document)

```javascript
{
  "_id": ObjectId,
  "sessionId": NumberLong, // 会话ID
  "sessionType": NumberInt, // 会话类型
  "participants": [NumberLong], // 参与者列表
  "lastMessageId": "最后消息ID",
  "lastMessageTime": NumberLong, // 最后消息时间
  "createTime": NumberLong, // 创建时间
  "updateTime": NumberLong, // 更新时间
  "extJson": {} // 扩展信息
}
```

## Redis数据结构设计

### 1. 用户会话管理

```redis
# 用户登录状态
SET user:session:{userId} {token} EX 7200

# 用户在线状态
SET user:online:{userId} {timestamp} EX 300

# 用户设备信息
HSET user:device:{userId} {deviceId} {deviceInfo}
```

### 2. 消息缓存

```redis
# 会话最新消息
SET session:last_msg:{sessionId} {messageId}

# 用户未读消息数量
INCR user:unread:{userId}:{sessionId}

# 消息确认状态
SET message:ack:{messageId}:{userId} {timestamp} EX 86400
```

### 3. 验证码缓存

```redis
# 注册验证码
SET register:code:{email} {code} EX 300

# 登录验证码
SET login:code:{email} {code} EX 300
```

### 4. 限流控制

```redis
# 接口限流
INCR rate_limit:{interface}:{userId}:{timeWindow}
EXPIRE rate_limit:{interface}:{userId}:{timeWindow} {timeWindow}
```

## 数据一致性保证

### 1. 事务管理

- **MySQL事务**: 使用Spring的`@Transactional`注解管理事务
- **分布式事务**: 使用Seata管理跨数据库事务
- **最终一致性**: 通过消息队列保证数据最终一致性

### 2. 数据同步

- **读写分离**: MySQL主从复制
- **缓存更新**: Redis与MySQL数据同步
- **消息同步**: 通过RocketMQ保证消息可靠投递

### 3. 数据备份

- **MySQL备份**: 定期全量备份和增量备份
- **MongoDB备份**: 使用mongodump进行备份
- **Redis备份**: RDB和AOF双重备份

## 性能优化

### 1. 索引优化

- **MySQL索引**: 根据查询模式设计合适的索引
- **MongoDB索引**: 使用复合索引优化查询性能
- **Redis索引**: 合理使用Redis的数据结构

### 2. 分库分表

- **水平分表**: 按用户ID进行分表
- **垂直分库**: 按业务模块分库
- **读写分离**: 主库写入，从库读取

### 3. 缓存策略

- **多级缓存**: 本地缓存 + Redis缓存
- **缓存预热**: 系统启动时预加载热点数据
- **缓存更新**: 使用Cache-Aside模式

## 监控与维护

### 1. 性能监控

- **数据库性能**: 监控慢查询、连接数、锁等待
- **缓存性能**: 监控命中率、内存使用率
- **消息队列**: 监控消息堆积、消费延迟

### 2. 数据维护

- **数据清理**: 定期清理过期数据
- **数据归档**: 历史数据归档到冷存储
- **数据修复**: 数据不一致时的修复机制

