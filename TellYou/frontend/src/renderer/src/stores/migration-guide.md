# Profile Store 迁移指南

## 概述
将原有的 `avatar/store.ts` 和 `profile/store.ts` 合并为统一的 `profile-store.ts`

## 迁移对比

### 旧的Avatar Store
```typescript
// 旧方式
import { useProfileStore as useAvatarStore } from "@/status/avatar/store"

const avatarStore = useAvatarStore()
const avatarPath = await avatarStore.getAvatar(userId, strategy, avatarUrl)
```

### 旧的Profile Store  
```typescript
// 旧方式
import { useProfileStore } from "@/status/profile/store"

const profileStore = useProfileStore()
const nickname = profileStore.ensureUser(userId, version, placeholder)
```

### 新的统一Store
```typescript
// 新方式
import { useProfileStore } from "@/stores/profile-store"

const profileStore = useProfileStore()

// 获取头像
const avatarPath = await profileStore.getAvatarPath(targetId, strategy, contactType, version)

// 获取昵称
const nickname = await profileStore.getNickname(targetId, contactType, placeholder)

// 触发更新
await profileStore.triggerUpdate(targetId, strategy, contactType)
```

## 主要变化

### 1. 统一的API
- **getAvatarPath()**: 替代 `getAvatar()` 和 `seekCache()`
- **getNickname()**: 替代 `ensureUser()` 和 `refreshUserName()`
- **triggerUpdate()**: 新增，主动触发更新

### 2. 支持群组
- 新增 `contactType` 参数：1=用户，2=群组
- 统一处理用户和群组的头像、昵称

### 3. 简化的逻辑
- 移除版本比对逻辑（交给主进程处理）
- 移除复杂的缓存策略（使用简单的内存缓存）
- 事件驱动的更新机制

### 4. 新的事件监听
- 自动监听 `profile-updated` 事件
- 主进程更新完成后自动刷新缓存

## 组件迁移示例

### Avatar组件
```vue
<template>
  <img :src="avatarPath" :alt="nickname" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProfileStore } from '@/stores/profile-store'

const props = defineProps<{
  targetId: string
  contactType?: number
  strategy?: string
  version?: string
}>()

const profileStore = useProfileStore()
const avatarPath = ref<string | null>(null)

// 获取头像
const loadAvatar = async () => {
  avatarPath.value = await profileStore.getAvatarPath(
    props.targetId,
    props.strategy || 'thumbedAvatarUrl',
    props.contactType || 1,
    props.version
  )
}

// 监听属性变化
watch(() => [props.targetId, props.version], loadAvatar, { immediate: true })
</script>
```

### Nickname组件
```vue
<template>
  <span>{{ nickname }}</span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useProfileStore } from '@/stores/profile-store'

const props = defineProps<{
  targetId: string
  contactType?: number
  placeholder?: string
}>()

const profileStore = useProfileStore()
const nickname = ref<string>('')

// 获取昵称
const loadNickname = async () => {
  nickname.value = await profileStore.getNickname(
    props.targetId,
    props.contactType || 1,
    props.placeholder || '未知'
  )
}

// 监听属性变化
watch(() => props.targetId, loadNickname, { immediate: true })
</script>
```

## 迁移步骤

1. **安装新Store**: 确保 `profile-store.ts` 已创建
2. **更新导入**: 将组件中的导入改为新的Store
3. **修改方法调用**: 按照新API调用方式修改
4. **添加contactType**: 为群组功能添加contactType参数
5. **测试功能**: 确保头像和昵称正常显示
6. **删除旧Store**: 确认迁移完成后删除旧文件

## 注意事项

- **向后兼容**: 新Store保持了基本的使用方式
- **性能优化**: 新Store有更好的缓存策略和防重复请求
- **错误处理**: 改进了错误处理和加载状态管理
- **群组支持**: 现在可以处理群组头像和名称

## 风险控制

- **渐进迁移**: 可以逐个组件迁移，不需要一次性全部更改
- **回滚方案**: 保留旧Store文件直到迁移完成
- **测试覆盖**: 重点测试头像加载和昵称显示功能
