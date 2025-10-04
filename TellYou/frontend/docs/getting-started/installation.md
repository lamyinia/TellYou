# 安装指南

## 环境要求

### 系统要求

- **Windows**: Windows 10 或更高版本
- **macOS**: macOS 10.14 或更高版本
- **Linux**: Ubuntu 18.04+ 或其他主流发行版

### 开发环境要求

- **Node.js**: >= 16.0.0 (推荐使用 LTS 版本)
- **npm**: >= 8.0.0 (通常随 Node.js 一起安装)
- **Git**: 用于版本控制

### 推荐工具

- **IDE**: Visual Studio Code
- **终端**: PowerShell (Windows) / Terminal (macOS/Linux)

## 安装步骤

### 1. 克隆项目

```bash
# 克隆整个项目
git clone <repository-url>
cd TellYou-project/TellYou

# 进入前端目录
cd frontend
```

### 2. 安装依赖

```bash
# 安装项目依赖
npm install

# 如果遇到网络问题，可以使用国内镜像
npm install --registry=https://registry.npmmirror.com
```

### 3. 环境配置

创建环境配置文件：

```bash
# 在 frontend 目录下创建 .env 文件
touch .env
```

编辑 `.env` 文件，添加以下配置：

```env
# 开发环境配置
NODE_ENV=development

# 后端 API 地址
VITE_REQUEST_URL=http://localhost:8080

# 应用基础路径
VITE_BASE_URL=/

# WebSocket 地址
VITE_WS_URL=ws://localhost:8080/ws
```

### 4. 验证安装

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查项目依赖是否正确安装
npm list --depth=0
```

## 开发环境搭建

### 1. 启动开发服务器

```bash
# 启动开发模式
npm run dev
```

开发服务器启动后，应用会自动打开。如果遇到端口冲突，可以修改 `electron.vite.config.ts` 中的端口配置。

### 2. 开发工具配置

#### VS Code 推荐插件

安装以下 VS Code 插件以获得更好的开发体验：

```json
{
  "recommendations": [
    "Vue.volar", // Vue 3 支持
    "Vue.vscode-typescript-vue-plugin",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss", // CSS 支持
    "esbenp.prettier-vscode", // 代码格式化
    "dbaeumer.vscode-eslint", // 代码检查
    "ms-vscode.vscode-json" // JSON 支持
  ]
}
```

#### 项目配置

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.vue": "vue"
  }
}
```

### 3. 代码质量工具

#### ESLint 配置

项目已配置 ESLint，运行以下命令检查代码质量：

```bash
# 检查代码规范
npm run lint

# 自动修复可修复的问题
npm run lint -- --fix
```

#### Prettier 配置

项目已配置 Prettier，运行以下命令格式化代码：

```bash
# 格式化所有代码
npm run format
```

#### TypeScript 类型检查

```bash
# 检查 TypeScript 类型
npm run typecheck

# 分别检查 Node 和 Web 环境
npm run typecheck:node
npm run typecheck:web
```

## 常见问题

### 1. 依赖安装失败

**问题**: npm install 失败或速度很慢

**解决方案**:

```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 或者使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install

# 清理缓存
npm cache clean --force
```

### 2. Node.js 版本不兼容

**问题**: Node.js 版本过低导致安装失败

**解决方案**:

```bash
# 使用 nvm 管理 Node.js 版本
# Windows
nvm install 18.17.0
nvm use 18.17.0

# macOS/Linux
nvm install 18.17.0
nvm use 18.17.0
```

### 3. 权限问题

**问题**: 在 macOS/Linux 上遇到权限错误

**解决方案**:

```bash
# 修复 npm 权限
sudo chown -R $(whoami) ~/.npm

# 或者使用 npx
npx npm install
```

### 4. 端口占用

**问题**: 开发服务器端口被占用

**解决方案**:

```bash
# 查看端口占用
netstat -ano | findstr :7969  # Windows
lsof -i :7969                 # macOS/Linux

# 修改端口配置
# 编辑 electron.vite.config.ts 中的 server.port
```

### 5. 数据库初始化失败

**问题**: SQLite 数据库初始化失败

**解决方案**:

```bash
# 确保有写入权限
# 检查用户数据目录权限
# Windows: %APPDATA%/TellYou
# macOS: ~/Library/Application Support/TellYou
# Linux: ~/.config/TellYou
```

## 下一步

安装完成后，您可以：

1. 阅读 [开发指南](../development/coding-standards.md) 了解编码规范
2. 查看 [架构文档](../architecture/overview.md) 了解系统设计
3. 开始 [功能开发](../features/) 或 [组件开发](../components/)

## 获取帮助

如果遇到其他问题：

1. 查看 [故障排除指南](../development/troubleshooting.md)
2. 在项目 Issues 中搜索相关问题
3. 创建新的 Issue 描述您的问题

---

**提示**: 建议在开始开发前先熟悉项目的整体架构和代码结构，这将大大提高开发效率。
