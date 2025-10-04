# 头像组件 (Avatar)

## 组件概述

Avatar 组件是 TellYou 应用中的核心 UI 组件，用于显示用户头像。支持多种显示模式、尺寸和状态，提供良好的用户体验。

## 功能特性

### ✨ 核心功能

- **多种显示模式**: 支持图片、文字、默认头像
- **尺寸定制**: 提供多种预设尺寸和自定义尺寸
- **状态指示**: 支持在线状态、未读消息等状态显示
- **懒加载**: 图片懒加载优化性能
- **缓存机制**: 头像缓存减少网络请求

### 🎨 视觉特性

- **圆形头像**: 默认圆形显示，支持方形模式
- **边框样式**: 可自定义边框颜色和宽度
- **阴影效果**: 支持阴影和发光效果
- **动画过渡**: 平滑的状态切换动画

## 组件 API

### Props

| 属性名        | 类型                                        | 默认值     | 说明                 |
| ------------- | ------------------------------------------- | ---------- | -------------------- |
| `src`         | `string`                                    | -          | 头像图片 URL         |
| `alt`         | `string`                                    | -          | 图片替代文本         |
| `size`        | `number \| string`                          | `40`       | 头像尺寸             |
| `shape`       | `'circle' \| 'square'`                      | `'circle'` | 头像形状             |
| `status`      | `'online' \| 'offline' \| 'busy' \| 'away'` | -          | 在线状态             |
| `showStatus`  | `boolean`                                   | `false`    | 是否显示状态指示器   |
| `placeholder` | `string`                                    | -          | 占位符文本           |
| `fallback`    | `string`                                    | -          | 加载失败时的备用图片 |
| `lazy`        | `boolean`                                   | `true`     | 是否启用懒加载       |
| `clickable`   | `boolean`                                   | `false`    | 是否可点击           |
| `border`      | `boolean \| object`                         | `false`    | 边框配置             |

### Events

| 事件名  | 参数                | 说明         |
| ------- | ------------------- | ------------ |
| `click` | `event: MouseEvent` | 点击事件     |
| `load`  | `event: Event`      | 图片加载成功 |
| `error` | `event: Event`      | 图片加载失败 |

### Slots

| 插槽名    | 说明             |
| --------- | ---------------- |
| `default` | 自定义头像内容   |
| `status`  | 自定义状态指示器 |

## 使用示例

### 基础用法

```vue
<template>
  <!-- 基础头像 -->
  <Avatar src="https://example.com/avatar.jpg" alt="用户头像" size="48" />

  <!-- 文字头像 -->
  <Avatar placeholder="张三" size="48" />

  <!-- 带状态的头像 -->
  <Avatar src="https://example.com/avatar.jpg" size="48" status="online" :show-status="true" />
</template>
```

### 高级用法

```vue
<template>
  <!-- 自定义尺寸和形状 -->
  <Avatar
    src="https://example.com/avatar.jpg"
    :size="64"
    shape="square"
    :border="{ color: '#4CAF50', width: 2 }"
  />

  <!-- 可点击头像 -->
  <Avatar
    src="https://example.com/avatar.jpg"
    size="48"
    :clickable="true"
    @click="handleAvatarClick"
  />

  <!-- 自定义状态指示器 -->
  <Avatar src="https://example.com/avatar.jpg" size="48" :show-status="true">
    <template #status>
      <div class="custom-status">VIP</div>
    </template>
  </Avatar>
</template>

<script setup lang="ts">
const handleAvatarClick = (event: MouseEvent) => {
  console.log('头像被点击', event)
}
</script>
```

### 在聊天界面中使用

```vue
<template>
  <div class="chat-message">
    <!-- 发送者头像 -->
    <Avatar
      :src="message.senderAvatar"
      :alt="message.senderName"
      size="32"
      :status="message.senderStatus"
      :show-status="true"
    />

    <div class="message-content">
      <div class="sender-name">{{ message.senderName }}</div>
      <div class="message-text">{{ message.content }}</div>
    </div>
  </div>
</template>
```

### 在联系人列表中使用

```vue
<template>
  <div class="contact-item">
    <Avatar
      :src="contact.avatar"
      :alt="contact.name"
      size="40"
      :status="contact.status"
      :show-status="true"
      :clickable="true"
      @click="openContactDetail(contact)"
    />

    <div class="contact-info">
      <div class="contact-name">{{ contact.name }}</div>
      <div class="last-message">{{ contact.lastMessage }}</div>
    </div>

    <!-- 未读消息数 -->
    <div v-if="contact.unreadCount > 0" class="unread-badge">
      {{ contact.unreadCount }}
    </div>
  </div>
</template>
```

## 组件实现

### 基础结构

```vue
<template>
  <div class="avatar-container" :class="avatarClasses" :style="avatarStyles" @click="handleClick">
    <!-- 头像图片 -->
    <img
      v-if="showImage"
      ref="imageRef"
      :src="actualSrc"
      :alt="alt"
      :class="imageClasses"
      @load="handleImageLoad"
      @error="handleImageError"
    />

    <!-- 文字头像 -->
    <div v-else-if="showText" class="avatar-text" :style="textStyles">
      {{ displayText }}
    </div>

    <!-- 默认头像 -->
    <div v-else class="avatar-default">
      <i class="icon-user"></i>
    </div>

    <!-- 状态指示器 -->
    <div v-if="showStatus && status" class="avatar-status" :class="`status-${status}`" />

    <!-- 自定义状态插槽 -->
    <div v-if="$slots.status" class="avatar-custom-status">
      <slot name="status" />
    </div>
  </div>
</template>
```

### 核心逻辑

```typescript
<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'

interface Props {
  src?: string
  alt?: string
  size?: number | string
  shape?: 'circle' | 'square'
  status?: 'online' | 'offline' | 'busy' | 'away'
  showStatus?: boolean
  placeholder?: string
  fallback?: string
  lazy?: boolean
  clickable?: boolean
  border?: boolean | object
}

const props = withDefaults(defineProps<Props>(), {
  size: 40,
  shape: 'circle',
  showStatus: false,
  lazy: true,
  clickable: false,
  border: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  load: [event: Event]
  error: [event: Event]
}>()

const imageRef = ref<HTMLImageElement>()
const imageLoaded = ref(false)
const imageError = ref(false)

// 计算属性
const avatarClasses = computed(() => [
  'avatar',
  `avatar-${props.shape}`,
  {
    'avatar-clickable': props.clickable,
    'avatar-with-border': !!props.border,
    'avatar-loaded': imageLoaded.value
  }
])

const avatarStyles = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    width: size,
    height: size,
    ...getBorderStyles()
  }
})

const showImage = computed(() => {
  return props.src && !imageError.value && (imageLoaded.value || !props.lazy)
})

const showText = computed(() => {
  return !showImage.value && props.placeholder
})

const displayText = computed(() => {
  if (!props.placeholder) return ''
  return props.placeholder.length > 2
    ? props.placeholder.slice(-2)
    : props.placeholder
})

const actualSrc = computed(() => {
  if (imageError.value && props.fallback) {
    return props.fallback
  }
  return props.src
})

// 方法
const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}

const handleImageLoad = (event: Event) => {
  imageLoaded.value = true
  emit('load', event)
}

const handleImageError = (event: Event) => {
  imageError.value = true
  emit('error', event)
}

const getBorderStyles = () => {
  if (!props.border) return {}

  if (typeof props.border === 'object') {
    return {
      borderColor: props.border.color || '#e0e0e0',
      borderWidth: `${props.border.width || 1}px`,
      borderStyle: 'solid'
    }
  }

  return {
    border: '1px solid #e0e0e0'
  }
}

// 懒加载逻辑
const setupLazyLoading = () => {
  if (!props.lazy || !props.src) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        imageLoaded.value = true
        observer.unobserve(entry.target)
      }
    })
  })

  if (imageRef.value) {
    observer.observe(imageRef.value)
  }
}

onMounted(() => {
  if (props.lazy) {
    setupLazyLoading()
  } else {
    imageLoaded.value = true
  }
})
</script>
```

### 样式定义

```scss
<style scoped>
.avatar-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
  transition: all 0.3s ease;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #f5f5f5;
}

.avatar-circle {
  border-radius: 50%;
}

.avatar-square {
  border-radius: 8px;
}

.avatar-clickable {
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.avatar-with-border {
  border: 1px solid #e0e0e0;
}

.avatar-text {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #666;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  color: #999;

  .icon-user {
    font-size: 60%;
  }
}

.avatar-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;

  &.status-online {
    background-color: #4CAF50;
  }

  &.status-offline {
    background-color: #9E9E9E;
  }

  &.status-busy {
    background-color: #F44336;
  }

  &.status-away {
    background-color: #FF9800;
  }
}

.avatar-custom-status {
  position: absolute;
  bottom: -2px;
  right: -2px;
}

// 响应式设计
@media (max-width: 768px) {
  .avatar-status {
    width: 10px;
    height: 10px;
  }
}
</style>
```

## 头像缓存

### 缓存服务

```typescript
// src/main/cache/avatar-cache.ts
export class AvatarCacheService {
  private cacheDir: string
  private maxCacheSize: number = 100 * 1024 * 1024 // 100MB

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), '.tellyou', 'cache', 'avatar')
    this.ensureCacheDir()
  }

  async getCachedAvatar(url: string): Promise<string | null> {
    const filename = this.getFilename(url)
    const filePath = path.join(this.cacheDir, filename)

    if (await this.fileExists(filePath)) {
      return `tellyou://avatar?path=${encodeURIComponent(filePath)}`
    }

    return null
  }

  async cacheAvatar(url: string, data: Buffer): Promise<string> {
    const filename = this.getFilename(url)
    const filePath = path.join(this.cacheDir, filename)

    await fs.promises.writeFile(filePath, data)

    // 检查缓存大小，必要时清理
    await this.cleanupCache()

    return `tellyou://avatar?path=${encodeURIComponent(filePath)}`
  }

  private getFilename(url: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex')
    const ext = path.extname(new URL(url).pathname) || '.jpg'
    return `${hash}${ext}`
  }

  private async cleanupCache(): Promise<void> {
    const files = await fs.promises.readdir(this.cacheDir)
    let totalSize = 0

    for (const file of files) {
      const filePath = path.join(this.cacheDir, file)
      const stats = await fs.promises.stat(filePath)
      totalSize += stats.size
    }

    if (totalSize > this.maxCacheSize) {
      // 删除最旧的文件
      const sortedFiles = files
        .map((file) => ({
          name: file,
          path: path.join(this.cacheDir, file),
          mtime: fs.promises.stat(path.join(this.cacheDir, file)).then((stats) => stats.mtime)
        }))
        .sort((a, b) => a.mtime.getTime() - b.mtime.getTime())

      const filesToDelete = sortedFiles.slice(0, Math.floor(files.length * 0.2))

      for (const file of filesToDelete) {
        await fs.promises.unlink(file.path)
      }
    }
  }
}
```

## 性能优化

### 1. 图片预加载

```typescript
// 预加载重要头像
const preloadAvatars = async (urls: string[]) => {
  const promises = urls.map((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
  })

  try {
    await Promise.all(promises)
    console.log('头像预加载完成')
  } catch (error) {
    console.warn('部分头像预加载失败', error)
  }
}
```

### 2. 虚拟滚动中的头像

```vue
<template>
  <div class="virtual-list">
    <div v-for="item in visibleItems" :key="item.id" class="list-item">
      <Avatar :src="item.avatar" :alt="item.name" size="32" :lazy="true" />
      <span>{{ item.name }}</span>
    </div>
  </div>
</template>
```

### 3. 内存管理

```typescript
// 组件卸载时清理资源
onUnmounted(() => {
  if (imageRef.value) {
    imageRef.value.src = ''
  }
})
```

## 测试

### 单元测试

```typescript
// tests/avatar.test.ts
import { mount } from '@vue/test-utils'
import Avatar from '@/components/Avatar.vue'

describe('Avatar Component', () => {
  it('renders image avatar correctly', () => {
    const wrapper = mount(Avatar, {
      props: {
        src: 'https://example.com/avatar.jpg',
        alt: 'Test Avatar',
        size: 48
      }
    })

    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/avatar.jpg')
  })

  it('renders text avatar when no image', () => {
    const wrapper = mount(Avatar, {
      props: {
        placeholder: '张三',
        size: 48
      }
    })

    expect(wrapper.find('.avatar-text').text()).toBe('张三')
  })

  it('emits click event when clickable', async () => {
    const wrapper = mount(Avatar, {
      props: {
        clickable: true,
        placeholder: 'Test'
      }
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### 视觉测试

```typescript
// tests/avatar-visual.test.ts
describe('Avatar Visual Tests', () => {
  it('displays different sizes correctly', () => {
    const sizes = [24, 32, 48, 64, 96]

    sizes.forEach((size) => {
      const wrapper = mount(Avatar, {
        props: { size, placeholder: 'Test' }
      })

      const element = wrapper.element as HTMLElement
      expect(element.style.width).toBe(`${size}px`)
      expect(element.style.height).toBe(`${size}px`)
    })
  })
})
```

## 最佳实践

### 1. 使用建议

- **尺寸选择**: 根据使用场景选择合适的头像尺寸
- **缓存策略**: 启用头像缓存以提高性能
- **懒加载**: 在列表中使用懒加载减少初始加载时间
- **备用方案**: 始终提供占位符或默认头像

### 2. 性能考虑

- 避免在短时间内创建大量 Avatar 组件
- 使用合适的图片格式和尺寸
- 定期清理头像缓存
- 在虚拟滚动中启用懒加载

### 3. 可访问性

```vue
<template>
  <Avatar
    :src="avatarSrc"
    :alt="`${userName}的头像`"
    :aria-label="`查看${userName}的个人资料`"
    :clickable="true"
    @click="openUserProfile"
  />
</template>
```

---

Avatar 组件是 TellYou 应用中的重要 UI 组件，通过合理的设计和优化，为用户提供了良好的视觉体验和交互体验。
