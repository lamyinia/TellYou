# TellYou IM系统 API接口文档

## 接口概览

TellYou IM系统提供RESTful API接口，支持用户管理、会话管理、消息处理等核心功能。

## 基础信息

- **Base URL**: `http://localhost:8081`
- **API版本**: v1
- **认证方式**: JWT Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 具体数据
  }
}
```

### 错误响应
```json
{
  "code": 40001,
  "message": "错误描述",
  "data": null
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 20001 | 参数错误 |
| 20002 | 验证码校验错误 |
| 20003 | 用户密码错误 |
| 20004 | 用户已被封号 |
| 50000 | 系统内部错误 |

## 接口分类

### 1. 用户账号管理 (`/userAccount`)

#### 1.1 用户注册
- **接口**: `POST /userAccount/register`
- **描述**: 用户注册接口
- **请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickName": "用户昵称",
  "code": "123456"
}
```
- **响应数据**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": null
}
```

#### 1.2 用户登录
- **接口**: `POST /userAccount/login`
- **描述**: 用户登录接口
- **请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **响应数据**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "uid": 123456789,
    "nickName": "用户昵称",
    "avatar": "头像URL",
    "token": "JWT_TOKEN"
  }
}
```

#### 1.3 获取验证码
- **接口**: `GET /userAccount/getCheckCode`
- **描述**: 获取注册验证码
- **请求参数**: 
  - `email`: 邮箱地址
- **响应数据**:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": null
}
```

### 2. 用户信息管理 (`/userInfo`)

#### 2.1 修改昵称
- **接口**: `PUT /userInfo/modifyNickName`
- **描述**: 修改用户昵称
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "nickName": "新昵称"
}
```

#### 2.2 修改头像
- **接口**: `PUT /userInfo/modifyAvatar`
- **描述**: 修改用户头像
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "avatar": "头像URL"
}
```

#### 2.3 修改签名
- **接口**: `PUT /userInfo/modifySignature`
- **描述**: 修改用户签名
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "signature": "个人签名"
}
```

#### 2.4 修改密码
- **接口**: `PUT /userInfo/modifyPassword`
- **描述**: 修改用户密码
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

#### 2.5 搜索用户
- **接口**: `GET /userInfo/SearchUid`
- **描述**: 根据用户ID搜索用户
- **认证**: 需要JWT Token
- **请求参数**:
  - `uid`: 用户ID
- **响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uid": 123456789,
    "nickName": "用户昵称",
    "avatar": "头像URL",
    "signature": "个人签名"
  }
}
```

### 3. 群组管理 (`/group`)

#### 3.1 创建群组
- **接口**: `POST /group/create`
- **描述**: 创建新群组
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "groupName": "群组名称",
  "description": "群组描述",
  "memberUids": [123456789, 987654321]
}
```

#### 3.2 加入群组
- **接口**: `POST /group/join`
- **描述**: 加入群组
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "groupId": 123456789
}
```

#### 3.3 退出群组
- **接口**: `POST /group/quit`
- **描述**: 退出群组
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "groupId": 123456789
}
```

#### 3.4 获取群组信息
- **接口**: `GET /group/info`
- **描述**: 获取群组详细信息
- **认证**: 需要JWT Token
- **请求参数**:
  - `groupId`: 群组ID
- **响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "groupId": 123456789,
    "groupName": "群组名称",
    "description": "群组描述",
    "memberCount": 10,
    "createTime": "2025-01-01T00:00:00Z"
  }
}
```

### 4. 消息管理 (`/message`)

#### 4.1 发送消息
- **接口**: `POST /message/send`
- **描述**: 发送消息
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "toUserId": 123456789,
  "messageType": 1,
  "content": "消息内容",
  "extJson": {}
}
```

#### 4.2 获取历史消息
- **接口**: `GET /message/history`
- **描述**: 获取历史消息
- **认证**: 需要JWT Token
- **请求参数**:
  - `sessionId`: 会话ID
  - `page`: 页码（默认1）
  - `size`: 每页大小（默认20）
- **响应数据**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "messages": [
      {
        "messageId": 123456789,
        "fromUid": 123456789,
        "content": "消息内容",
        "messageType": 1,
        "createTime": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "size": 20
  }
}
```

#### 4.3 消息确认
- **接口**: `POST /message/ack`
- **描述**: 确认收到消息
- **认证**: 需要JWT Token
- **请求参数**:
```json
{
  "messageId": 123456789,
  "sessionId": 123456789
}
```

## 消息类型说明

| 类型值 | 类型名称 | 说明 |
|--------|----------|------|
| 0 | HEARTBEAT | 心跳消息 |
| 1 | PRIVATE_TEXT | 私聊文本消息 |
| 2 | PRIVATE_IMAGE | 私聊图片消息 |
| 3 | PRIVATE_VIDEO | 私聊视频消息 |
| 4 | PRIVATE_VOICE | 私聊语音消息 |
| 5 | PRIVATE_PACKET | 私聊红包消息 |
| 6 | GROUP_TEXT | 群聊文本消息 |
| 7 | GROUP_IMAGE | 群聊图片消息 |
| 8 | GROUP_VIDEO | 群聊视频消息 |
| 9 | GROUP_VOICE | 群聊语音消息 |
| 10 | GROUP_PACKET | 群聊红包消息 |
| 101 | ACK_CONFIRM | ACK确认消息 |

## 认证说明

### JWT Token格式
```
Authorization: Bearer <JWT_TOKEN>
```

### Token获取
通过登录接口获取JWT Token，Token包含用户ID等信息。

### Token刷新
Token有过期时间，客户端需要在Token过期前刷新或重新登录。

## 限流说明

系统对部分接口进行了限流控制：

- 注册接口：5分钟内最多3次
- 登录接口：1分钟内最多10次
- 发送消息：10秒内最多20次

## WebSocket连接

### 连接地址
```
ws://localhost:8082/ws
```

### 连接参数
- `token`: JWT Token（必需）
- `uid`: 用户ID（必需）

### 消息格式
```json
{
  "type": 1,
  "content": "消息内容",
  "toUserId": 123456789,
  "extJson": {}
}
```

## 文件上传

### 上传接口
- **接口**: `POST /file/upload`
- **描述**: 上传文件（图片、视频、语音等）
- **认证**: 需要JWT Token
- **请求类型**: `multipart/form-data`
- **请求参数**:
  - `file`: 文件
  - `type`: 文件类型（image/video/voice）

### 响应数据
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "fileId": "文件ID",
    "url": "文件访问URL",
    "size": 1024000,
    "type": "image"
  }
}
```

## 接口测试

### Swagger文档
访问 `http://localhost:8081/doc.html` 查看完整的API文档和在线测试功能。

### Postman集合
可以导入Postman集合进行接口测试，集合文件位于 `docs/api/postman/` 目录。

