import { defineStore } from "pinia";
import { nextTick, reactive } from "vue";

interface AvatarCacheItem {
  version: string;
  localPath: string | null;
  loading: boolean;
  error: string | null;
  lastAccessed: number;
}
/**
 * lanye
 * 2025/09/28 17:27
 * 约定优于配置
 */

export const useAvatarStore = defineStore("avatar", () => {
  const memoryCache = reactive<Map<string, AvatarCacheItem>>(new Map());
  const maxMemoryCache = 200;

  const getCacheKey = (userId: string, strategy: string): string =>
    userId + "_" + strategy;

  // 例子 http://113.44.158.255:32788/lanye/avatar/original/1948031012053333361/6/index.png?hash=3，这里返回 6
  const extractVersionFromUrl = (url: string): string =>
    new URL(url).pathname.split("/").at(-2) || "0";
  //  ttl 策略
  const cleanupMemoryCache = (): void => {
    if (memoryCache.size <= maxMemoryCache) return;
    const items = Array.from(memoryCache.entries())
      .map(([key, item]) => ({ key, item, lastAccessed: item.lastAccessed }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    const toDelete = items.slice(0, items.length - maxMemoryCache);
    toDelete.forEach(({ key }) => {
      memoryCache.delete(key);
    });
  };
  //  查主进程有的版本号，以此判断需不需要更新
  const seekCache = async (
    userId: string,
    strategy: string,
    version: string,
  ): Promise<{ needUpdated: boolean; pathResult: string }> => {
    const item = memoryCache.get(getCacheKey(userId, strategy));
    // console.info('debug:seekCache:   ', [userId, strategy, version].join('---'))
    if (
      item &&
      item.localPath &&
      Number.parseInt(item.version) >= Number.parseInt(version)
    ) {
      // console.info('avatarStore:seekCache:渲染进程缓存命中   ', item, [userId, strategy, version].join(','))
      return { needUpdated: false, pathResult: item.localPath };
    }
    const resp = await window.electronAPI.invoke(
      "avatar:cache:seek-by-version",
      { userId, strategy, version },
    );
    if (resp.success) {
      // console.info('avatarStore:seekCache:主进程缓存命中 ', resp)
      memoryCache.set(getCacheKey(userId, strategy), {
        version: version,
        localPath: resp.pathResult,
        loading: false,
        error: null,
        lastAccessed: Date.now(),
      } as AvatarCacheItem);
    }
    return { needUpdated: !resp.success, pathResult: resp.pathResult };
  };

  const getAvatar = async (
    userId: string,
    strategy: string,
    avatarUrl: string,
  ): Promise<string | null> => {
    if (!userId || !avatarUrl) return null;
    const key: string = getCacheKey(userId, strategy);
    const version = extractVersionFromUrl(avatarUrl);
    const cached = memoryCache.get(key);

    if (
      cached &&
      cached.localPath &&
      Number.parseInt(cached.version) >= Number.parseInt(version)
    ) {
      // console.info('avatarStore:getAvatar:渲染进程缓存命中   ', cached)
      return cached.localPath;
    }
    if (cached?.loading) {
      // console.info('debug:getAvatar:正在加载，等待其它任务完成')
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const current = memoryCache.get(key);
          if (current && !current.loading) {
            console.log(
              "avatarStore:getAvatar:loading:命中 ",
              current.localPath,
            );
            clearInterval(checkInterval);
            resolve(current.localPath);
          } else {
            console.log("avatarStore:getAvatar:loading:未命中");
          }
        }, 200);
      });
    }

    const cacheItem: AvatarCacheItem = {
      version: version,
      localPath: null,
      loading: true,
      error: null,
      lastAccessed: Date.now(),
    };
    memoryCache.set(key, cacheItem);

    try {
      const localPath = await window.electronAPI.getNewerAvatar({
        userId,
        strategy,
        avatarUrl,
      });
      // console.log('获取localPath成功:', localPath)
      if (localPath) {
        cacheItem.localPath = localPath;
        await nextTick();
        return localPath;
      } else {
        cacheItem.error = "Download failed";
        return null;
      }
    } catch (error) {
      cacheItem.error =
        error instanceof Error ? error.message : "Unknown error";
      return null;
    } finally {
      cacheItem.loading = false;
      cleanupMemoryCache();
    }
  };
  const clearMemoryCache = (): void => {
    memoryCache.clear();
  };
  return {
    extractVersionFromUrl,
    memoryCache,
    seekCache,
    getAvatar,
    clearMemoryCache,
  };
});
