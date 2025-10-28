<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source?: string;
}

const logs = ref<LogEntry[]>([]);
const filteredLogs = ref<LogEntry[]>([]);
const searchText = ref("");
const selectedLevels = ref<string[]>(["info", "warn", "error", "debug"]);
const autoScroll = ref(true);
const logContainer = ref<HTMLElement>();

let logIdCounter = 0;

// 日志级别颜色映射
const levelColors = {
  info: "#2196f3",
  warn: "#ff9800",
  error: "#f44336",
  debug: "#4caf50",
};

// 添加日志条目
const addLog = (level: LogEntry["level"], message: string, source?: string) => {
  const logEntry: LogEntry = {
    id: ++logIdCounter,
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
    source,
  };

  logs.value.push(logEntry);

  // 限制日志数量，避免内存溢出
  if (logs.value.length > 1000) {
    logs.value.shift();
  }

  filterLogs();

  // 自动滚动到底部
  if (autoScroll.value) {
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      }
    });
  }
};

// 过滤日志
const filterLogs = () => {
  filteredLogs.value = logs.value.filter((log) => {
    const levelMatch = selectedLevels.value.includes(log.level);
    const textMatch =
      !searchText.value ||
      log.message.toLowerCase().includes(searchText.value.toLowerCase()) ||
      (log.source &&
        log.source.toLowerCase().includes(searchText.value.toLowerCase()));

    return levelMatch && textMatch;
  });
};

// 清空日志
const clearLogs = () => {
  logs.value = [];
  filteredLogs.value = [];
};

// 导出日志
const exportLogs = () => {
  const logText = logs.value
    .map(
      (log) =>
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source ? `[${log.source}] ` : ""}${log.message}`,
    )
    .join("\n");

  const blob = new Blob([logText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tellyou-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.log`;
  a.click();
  URL.revokeObjectURL(url);
};

// 切换日志级别过滤
const toggleLevel = (level: string) => {
  const index = selectedLevels.value.indexOf(level);
  if (index > -1) {
    selectedLevels.value.splice(index, 1);
  } else {
    selectedLevels.value.push(level);
  }
  filterLogs();
};

// 监听搜索文本变化
const onSearchChange = () => {
  filterLogs();
};

// 模拟接收主进程日志（后续会通过IPC实现）
const simulateMainProcessLogs = () => {
  addLog("info", "主进程启动完成", "DeviceService");
  addLog("debug", "初始化WebSocket连接", "WebSocketClient");
  addLog("warn", "调试模式已启用", "System");
  addLog("error", "模拟错误日志", "TestModule");
};

// 接收主进程日志的处理函数
const handleMainProcessLog = (...args: unknown[]) => {
  const logData = args[1] as {
    level: string;
    message: string;
    source: string;
    timestamp: string;
  };
  if (logData && logData.level && logData.message) {
    addLog(logData.level as LogEntry["level"], logData.message, logData.source);
  }
};

onMounted(() => {
  // 初始化一些示例日志
  addLog("info", "调试窗口已启动", "DebugWindow");

  // 监听主进程日志
  if (window.electronAPI && window.electronAPI.on) {
    window.electronAPI.on("debug-log", handleMainProcessLog);
    addLog("info", "开始监听主进程日志", "DebugWindow");
  } else {
    addLog("warn", "electronAPI不可用，使用模拟日志", "DebugWindow");
    simulateMainProcessLogs();
  }
});

onUnmounted(() => {
  // 清理IPC监听器
  if (window.electronAPI && window.electronAPI.removeListener) {
    window.electronAPI.removeListener("debug-log", handleMainProcessLog);
  }
});
</script>

<template>
  <div class="debug-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h3>TellYou 主进程调试</h3>
      </div>
      <div class="toolbar-center">
        <!-- 日志级别过滤 -->
        <div class="level-filters">
          <button
            v-for="level in ['info', 'warn', 'error', 'debug']"
            :key="level"
            :class="[
              'level-btn',
              level,
              { active: selectedLevels.includes(level) },
            ]"
            @click="toggleLevel(level)"
          >
            {{ level.toUpperCase() }}
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <!-- 搜索框 -->
        <input
          v-model="searchText"
          type="text"
          placeholder="搜索日志..."
          class="search-input"
          @input="onSearchChange"
        />
        <!-- 控制按钮 -->
        <button class="control-btn" @click="clearLogs">清空</button>
        <button class="control-btn" @click="exportLogs">导出</button>
        <label class="auto-scroll-label">
          <input v-model="autoScroll" type="checkbox" />
          自动滚动
        </label>
      </div>
    </div>

    <!-- 日志显示区域 -->
    <div ref="logContainer" class="log-container">
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        :class="['log-entry', log.level]"
      >
        <span class="timestamp">{{ log.timestamp }}</span>
        <span :class="['level', log.level]">{{ log.level.toUpperCase() }}</span>
        <span v-if="log.source" class="source">[{{ log.source }}]</span>
        <span class="message">{{ log.message }}</span>
      </div>
      <div v-if="filteredLogs.length === 0" class="no-logs">暂无日志数据</div>
    </div>
  </div>
</template>

<style scoped>
.debug-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #ffffff;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
  flex-shrink: 0;
}

.toolbar-left h3 {
  margin: 0;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.level-filters {
  display: flex;
  gap: 4px;
}

.level-btn {
  padding: 4px 8px;
  border: 1px solid #404040;
  background: #2d2d2d;
  color: #cccccc;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.level-btn:hover {
  background: #404040;
}

.level-btn.active {
  border-color: currentColor;
  font-weight: bold;
}

.level-btn.info.active {
  color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.level-btn.warn.active {
  color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.level-btn.error.active {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.level-btn.debug.active {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  padding: 4px 8px;
  border: 1px solid #404040;
  background: #1e1e1e;
  color: #ffffff;
  border-radius: 3px;
  font-size: 12px;
  width: 150px;
}

.search-input:focus {
  outline: none;
  border-color: #2196f3;
}

.control-btn {
  padding: 4px 12px;
  border: 1px solid #404040;
  background: #2d2d2d;
  color: #ffffff;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #404040;
}

.auto-scroll-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
}

.auto-scroll-label input {
  margin: 0;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background: #1e1e1e;
}

.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.4;
  border-left: 3px solid transparent;
  padding-left: 8px;
  margin-bottom: 1px;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.05);
}

.log-entry.info {
  border-left-color: #2196f3;
}

.log-entry.warn {
  border-left-color: #ff9800;
}

.log-entry.error {
  border-left-color: #f44336;
}

.log-entry.debug {
  border-left-color: #4caf50;
}

.timestamp {
  color: #888888;
  font-size: 11px;
  min-width: 80px;
  flex-shrink: 0;
}

.level {
  font-weight: bold;
  min-width: 50px;
  flex-shrink: 0;
  font-size: 11px;
}

.level.info {
  color: #2196f3;
}

.level.warn {
  color: #ff9800;
}

.level.error {
  color: #f44336;
}

.level.debug {
  color: #4caf50;
}

.source {
  color: #bb86fc;
  font-size: 11px;
  min-width: 100px;
  flex-shrink: 0;
}

.message {
  color: #ffffff;
  word-break: break-word;
  flex: 1;
}

.no-logs {
  text-align: center;
  color: #888888;
  padding: 40px;
  font-style: italic;
}

/* 滚动条样式 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.log-container::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #555555;
}
</style>
