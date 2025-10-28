/* eslint-disable */
import { ipcMain, BrowserWindow } from "electron"
import path, { join } from "path"
import { existsSync, writeFileSync } from "fs"
import { netMinIO, netMaster } from "../util/net-util"
import log from "electron-log"
import urlUtil from "@main/util/url-util"
import profileDao from "../sqlite/dao/profile-dao"

interface ProfileData {
  targetId: string
  contactType: number  // 1=用户, 2=群组
  nickname?: string
  nickVersion: string
  avatarVersion: string
  avatarOriginalPath?: string
  avatarThumbPath?: string
  lastNickUpdate: number
  lastAvatarUpdate: number
  createdAt: number
}

/**
 * ProfileService - 统一管理用户和群组的头像、昵称
 *
 * 核心特性：
 * 1. 数据库持久化存储
 * 2. 版本控制和缓存策略
 * 3. 支持用户(contactType=1)和群组(contactType=2)
 * 4. 3分钟缓存策略，8秒内存防并发
 * 5. 事件驱动的UI更新
 *
 * @author lanye
 * @since 2025/10/29
 */
class ProfileService {
  private memoryCache = new Map<string, ProfileData>()
  private inflightRequests = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 3 * 60 * 1000  // 3分钟
  private readonly MEMORY_TTL = 8 * 1000           // 8秒内存缓存

  public beginServe(): void {
    ipcMain.handle('profile:get-avatar-path', this.handleGetAvatarPath.bind(this))
    ipcMain.handle('profile:get-nickname', this.handleGetNickname.bind(this))
    ipcMain.handle('profile:trigger-update', this.handleTriggerUpdate.bind(this))
  }

  /**
   * 获取头像本地路径
   */
  private async handleGetAvatarPath(_: any, params: { targetId: string; strategy: string; contactType: number; version?: string}):
    Promise<{ success: boolean; localPath?: string }> {
    try {
      const { targetId, strategy, contactType } = params
      const version = params.version || '9999'
      const profile = await this.getProfileFromDB(targetId, contactType)

      if (profile) {
        const currentVersion = parseInt(profile.avatarVersion) || 0
        const requestVersion = parseInt(version)

        if (currentVersion >= requestVersion) {
          // 版本满足要求，返回本地路径
          const localPath = strategy === 'thumbedAvatarUrl' ? profile.avatarThumbPath : profile.avatarOriginalPath
          if (localPath && existsSync(localPath)) {
            return {
              success: true,
              localPath: urlUtil.signByApp("avatar", localPath)
            }
          }
        }
      }
      await this.triggerAvatarUpdate(targetId, contactType, strategy)

      // 更新后重新尝试获取
      const updatedProfile = await this.getProfileFromDB(targetId, contactType)
      if (updatedProfile) {
        const localPath = strategy === 'thumbedAvatarUrl' ? updatedProfile.avatarThumbPath : updatedProfile.avatarOriginalPath
        if (localPath && existsSync(localPath)) {
          return { success: true, localPath: urlUtil.signByApp("avatar", localPath) }
        }
      }

      return { success: false }
    } catch (error) {
      log.error('ProfileService:handleGetAvatarPath error:', error)
      return { success: false }
    }
  }

  /**
   * 获取昵称
   */
  private async handleGetNickname(_: any, params: { targetId: string; contactType: number }):
    Promise<{ nickname?: string; version?: string }> {
    try {
      const { targetId, contactType } = params

      let profile = await this.getProfileFromDB(targetId, contactType)

      const now = Date.now()
      const needUpdate = !profile || !profile.nickname || (now - profile.lastNickUpdate) > this.CACHE_DURATION
      if (needUpdate) {
        await this.triggerNicknameUpdate(targetId, contactType)
        profile = await this.getProfileFromDB(targetId, contactType)
      }

      return {
        nickname: profile?.nickname,
        version: profile?.nickVersion || '0'
      }
    } catch (error) {
      log.error('ProfileService:handleGetNickname error:', error)
      return {}
    }
  }

  /**
   * 触发Profile更新
   */
  private async handleTriggerUpdate(_: any, params: { targetId: string; strategy: string; contactType: number }): Promise<void> {
    try {
      const { targetId, strategy, contactType } = params
      // 并发控制
      const cacheKey = `${targetId}_${contactType}_${strategy}`
      if (this.inflightRequests.has(cacheKey)) {
        await this.inflightRequests.get(cacheKey)
        return
      }
      const promise = this.performProfileUpdate(targetId, contactType, strategy)
      this.inflightRequests.set(cacheKey, promise)
      try {
        await promise
      } finally {
        this.inflightRequests.delete(cacheKey)
      }
    } catch (error) {
      log.error('ProfileService:handleTriggerUpdate error:', error)
    }
  }

  /**
   * 执行Profile更新
   */
  private async performProfileUpdate(targetId: string, contactType: number, strategy: string): Promise<void> {
    const now = Date.now()

    const profile = await this.getProfileFromDB(targetId, contactType)
    if (profile && (now - profile.lastAvatarUpdate) < this.CACHE_DURATION) {
      log.info(`ProfileService: 跳过更新，缓存未过期 ${targetId}`)
      return
    }

    try {
      if (contactType === 1) {
        await this.updateUserProfile(targetId, strategy)
      } else if (contactType === 2) {
        await this.updateGroupProfile(targetId, strategy)
      }

      this.notifyProfileUpdated(targetId, contactType, strategy)
    } catch (error) {
      log.error(`ProfileService: 更新失败 ${targetId}:`, error)
    }
  }

  /**
   * 更新用户Profile
   */
  private async updateUserProfile(targetId: string, strategy: string): Promise<void> {
    // 获取用户元信息
    const metaJson = await this.getUserMetaJson(targetId)

    // 更新昵称
    if (metaJson.nickname) {
      await this.updateNicknameInDB(targetId, 1, {
        nickname: metaJson.nickname as string,
        nickVersion: (metaJson.nickVersion as string) || '0'
      })
    }

    // 更新头像
    const avatarUrl = metaJson[strategy] as string
    if (avatarUrl) {
      await this.downloadAndSaveAvatar(targetId, 1, strategy, avatarUrl)
    }
  }

  /**
   * 更新群组Profile
   */
  private async updateGroupProfile(targetId: string, strategy: string): Promise<void> {
    // 调用群组信息接口
    const groupInfo = await this.getGroupInfo(targetId)
    log.info('ProfileService:handleUpdateGroupProfile', targetId, groupInfo)
    if (groupInfo) {
      await this.updateNicknameInDB(targetId, 2, {
        nickname: groupInfo.groupName,
        nickVersion: '1' // 群组暂不支持版本控制
      })
      if (groupInfo.avatar) {
        await this.downloadAndSaveAvatar(targetId, 2, strategy, groupInfo.avatar)
      }
    }
  }
  /**
   * 获取用户元信息JSON
   */
  private async getUserMetaJson(userId: string): Promise<Record<string, unknown>> {
    const cacheKey = `user_meta_${userId}`
    const cached = this.memoryCache.get(cacheKey) as any
    if (cached && (Date.now() - cached.timestamp) < this.MEMORY_TTL) {
      return cached.data
    }
    const result = await netMinIO.downloadJson([urlUtil.atomPath, userId + ".json"].join("/"))
    this.memoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    } as any)
    setTimeout(() => this.memoryCache.delete(cacheKey), this.MEMORY_TTL)
    return result
  }
  /**
   * 获取群组信息
   */
  private async getGroupInfo(groupId: string): Promise<any> {
    try {
      log.info(`ProfileService: 获取群组信息 ${groupId}`)
      const response = await netMaster.post('/group/base-info-list', {
        targetList: [groupId]
      })

      if (response.data.success && response.data.data && response.data.data.groupInfoList && response.data.data.groupInfoList.length > 0) {
        return response.data.data.groupInfoList[0] // 返回第一个群组信息
      }

      return null
    } catch (error) {
      log.error(`ProfileService: 获取群组信息失败 ${groupId}:`, error)
      return null
    }
  }
  /**
   * 下载并保存头像
   */
  private async downloadAndSaveAvatar(targetId: string, contactType: number, strategy: string, avatarUrl: string): Promise<void> {
    try {
      const version = this.extractVersionFromUrl(avatarUrl)
      const fileName = this.extractObjectFromUrl(avatarUrl)

      const filePath = join(urlUtil.cachePaths["avatar"], targetId + "_" + contactType, strategy, fileName)

      urlUtil.ensureDir(path.dirname(filePath))
      const arrayBuffer = await netMinIO.downloadAvatar(avatarUrl)
      if (arrayBuffer) {
        writeFileSync(filePath, Buffer.from(arrayBuffer))
        await this.updateAvatarInDB(targetId, contactType, { strategy, version, localPath: filePath })
        log.info(`ProfileService: 头像下载成功 ${targetId} -> ${filePath}`)
      }
    } catch (error) {
      log.error(`ProfileService: 头像下载失败 ${targetId}:`, error)
    }
  }

  /**
   * 触发头像更新
   */
  private async triggerAvatarUpdate(targetId: string, contactType: number, strategy: string): Promise<void> {
    await this.performProfileUpdate(targetId, contactType, strategy)
  }

  /**
   * 触发昵称更新
   */
  private async triggerNicknameUpdate(targetId: string, contactType: number): Promise<void> {
    await this.performProfileUpdate(targetId, contactType, 'nickname')
  }

  /**
   * 从数据库获取Profile
   */
  private async getProfileFromDB(targetId: string, contactType: number): Promise<ProfileData | null> {
    try {
      const profile = await profileDao.selectProfile(targetId, contactType)
      if (!profile) return null

      return {
        targetId: profile.targetId,
        contactType: profile.contactType,
        nickname: profile.nickname,
        nickVersion: profile.nickVersion,
        avatarVersion: profile.avatarVersion,
        avatarOriginalPath: profile.avatarOriginalPath,
        avatarThumbPath: profile.avatarThumbPath,
        lastNickUpdate: profile.lastNickUpdate,
        lastAvatarUpdate: profile.lastAvatarUpdate,
        createdAt: profile.createdAt
      }
    } catch (error) {
      log.error('ProfileService:getProfileFromDB error:', error)
      return null
    }
  }

  /**
   * 更新数据库中的昵称信息
   */
  private async updateNicknameInDB(
    targetId: string,
    contactType: number,
    data: { nickname: string; nickVersion: string }
  ): Promise<void> {
    try {
      await profileDao.upsertNickname(targetId, contactType, {
        nickname: data.nickname,
        nickVersion: data.nickVersion
      })

      log.info(`ProfileService: 昵称更新成功 ${targetId}: ${data.nickname}`)
    } catch (error) {
      log.error('ProfileService:updateNicknameInDB error:', error)
    }
  }

  /**
   * 更新数据库中的头像信息
   */
  private async updateAvatarInDB(targetId: string, contactType: number, data: { strategy: string; version: string; localPath: string }
  ): Promise<void> {
    try {
      const { strategy, version, localPath } = data

      await profileDao.upsertAvatar(targetId, contactType, {
        strategy,
        version,
        localPath
      })

      log.info(`ProfileService: 头像路径更新成功 ${targetId}: ${localPath}`)
    } catch (error) {
      log.error('ProfileService:updateAvatarInDB error:', error)
    }
  }

  /**
   * 通知渲染进程Profile已更新
   */
  private notifyProfileUpdated(targetId: string, contactType: number, strategy: string): void {
    try {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach(window => {
        window.webContents.send('profile-updated', {
          targetId,
          contactType,
          strategy,
          timestamp: Date.now()
        })
      })

      log.info(`ProfileService: 通知UI更新 ${targetId}_${contactType}_${strategy}`)
    } catch (error) {
      log.error('ProfileService:notifyProfileUpdated error:', error)
    }
  }

  /**
   * 从URL提取版本号
   */
  private extractVersionFromUrl(url: string): string {
    try {
      return new URL(url).pathname.split("/").at(-2) || "0"
    } catch {
      return "0"
    }
  }

  /**
   * 从URL提取文件名
   */
  private extractObjectFromUrl(url: string): string {
    try {
      return new URL(url).pathname.split("/").at(-1) || "avatar.png"
    } catch {
      return "avatar.png"
    }
  }
}

const profileService = new ProfileService();
export default profileService
