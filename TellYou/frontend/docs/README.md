# TellYou - 通彼 前端文档

## 项目简介

TellYou（通彼）是一个基于 Electron + Vue 3 + TypeScript 开发的跨平台桌面聊天应用。该应用提供了完整的即时通讯功能，包括用户认证、聊天会话、联系人管理、媒体分享等功能。

## 技术栈

### 核心技术

- **Electron**: 跨平台桌面应用框架
- **Vue 3**: 前端框架，使用 Composition API
- **TypeScript**: 类型安全的 JavaScript 超集
- **Vite**: 快速的前端构建工具

### 主要依赖

- **Pinia**: Vue 状态管理
- **Vue Router**: 路由管理
- **Axios**: HTTP 客户端
- **SQLite3**: 本地数据库
- **WebSocket**: 实时通信
- **Electron Store**: 数据持久化
- **Sharp**: 图像处理

## 项目结构

```
frontend/
├── src/
│   ├── main/                   # Electron 主进程
│   │   ├── pull-service.ts           # 主进程入口
│   │   ├── sqlite/            # 数据库相关
│   │   ├── websocket/         # WebSocket 客户端
│   │   ├── service/           # 服务层
│   │   └── electron-store/    # 数据存储
│   ├── preload/               # 预加载脚本
│   └── renderer/              # 渲染进程（Vue 应用）
│       ├── src/
│       │   ├── views/         # 页面组件
│       │   ├── components/    # 通用组件
│       │   ├── router/        # 路由配置
│       │   ├── status/        # 状态管理
│       │   └── utils/         # 工具函数
│       └── index.html
├── resources/                 # 应用资源
└── docs/                     # 项目文档
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
cd frontend
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# 构建所有平台
npm run build

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 主要功能

### 🔐 用户认证

- 用户登录/注册
- 会话管理
- 自动登录

### 💬 聊天功能

- 实时消息收发
- 文本、图片、文件消息
- 消息历史记录
- 会话管理

### 👥 联系人管理

- 好友列表
- 好友申请
- 黑名单管理
- 群组管理

### ⚙️ 系统设置

- 用户偏好设置
- 应用配置
- 数据管理

## 开发指南

### 编码规范

- 使用 TypeScript 进行类型检查
- 遵循 Vue 3 Composition API 最佳实践
- 使用 ESLint + Prettier 进行代码格式化

### 状态管理

- 使用 Pinia 进行状态管理
- 按功能模块划分 store
- 支持数据持久化

### 数据库

- 使用 SQLite3 作为本地数据库
- 通过 DAO 模式进行数据访问
- 支持数据迁移和版本管理

## 文档导航

- [快速开始](./getting-started/installation.md) - 安装和开发环境搭建
- [架构设计](./architecture/overview.md) - 系统架构和技术选型
- [功能模块](./features/) - 各功能模块详细说明
- [组件文档](./components/) - 组件使用指南
- [API 文档](./api/) - 接口和通信协议
- [开发指南](./development/) - 开发规范和最佳实践

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至项目维护者

---

**注意**: 本文档会随着项目的发展持续更新，请定期查看最新版本。
