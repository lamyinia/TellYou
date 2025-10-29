/* eslint-disable */
import { ipcMain, BrowserWindow } from "electron"
import path, { join } from "path"
import { existsSync, writeFileSync } from "fs"
import { netMinIO, netMaster } from "../util/net-util"
import log from "electron-log"
import urlUtil from "@main/util/url-util"
import profileDao from "../sqlite/dao/profile-dao"

/**
 * 主要问题 （已解决-20251030-1:06）
 * 1) 多余的内存过期逻辑，如时间比对，只需要用 setTimeout 就能保证了
 * 2) getNickname 缺少版本比对的逻辑，存缓存的逻辑
 * 3) notify 渲染进程参数缺失，时机错误
 */


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

interface ProfileData {
  targetId: string
  contactType: number
  nickname: string
  nickVersion: string
  avatarVersion: string
  avatarOriginalPath: string
  avatarThumbPath: string
  lastNickUpdate: number
  lastAvatarUpdate: number
  createdAt: number
}

class ProfileService {
  private memoryCache = new Map<string, any>()
  private inflightRequests = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 2 * 60 * 1000  // 2 分钟请求防抖
  private readonly MEMORY_TTL = 8 * 1000           // 8 秒内存缓存

  public beginServe(): void {
    ipcMain.handle('profile:get-avatar-path', this.handleGetAvatarPath.bind(this))
    ipcMain.handle('profile:get-nickname', this.handleGetNickname.bind(this))
    ipcMain.handle('profile:trigger-update', this.handleTriggerUpdate.bind(this))
  }

  /**
   * 获取头像本地路径
   */
  private async handleGetAvatarPath(_event: Electron.IpcMainInvokeEvent, params: { targetId: string, strategy: string, contactType: number, version: string}):
    Promise<{ success: boolean; localPath?: string }> {
    try {
      const { targetId, strategy, contactType, version } = params
      const profile = await this.getProfileFromDB(targetId, contactType)

      if (profile?.avatarVersion) {
        const currentVersion = parseInt(profile.avatarVersion)
        const requestVersion = parseInt(version)

        if (currentVersion >= requestVersion || profile?.lastAvatarUpdate > Date.now() - this.CACHE_DURATION) {
          // 版本满足要求，且缓存未过期，返回本地路径
          const localPath = strategy === 'thumbedAvatarUrl' ? profile.avatarThumbPath : profile.avatarOriginalPath
          if (localPath && existsSync(localPath)) {
            return { success: true, localPath: urlUtil.signByApp("avatar", localPath) }
          }
        }
      }
      await this.triggerAvatarUpdate(targetId, contactType, strategy)

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
  private async handleGetNickname(_event: Electron.IpcMainInvokeEvent, params: { targetId: string, contactType: number, version: string }):Promise<string> {
    try {
      const { targetId, contactType, version } = params

      let profile = await this.getProfileFromDB(targetId, contactType)
      if (profile?.nickVersion && profile?.nickname) {
        const currentVersion = parseInt(profile.nickVersion)
        const requestVersion = parseInt(version)

        if (currentVersion >= requestVersion || profile?.lastNickUpdate > Date.now() - this.CACHE_DURATION) {
          return profile.nickname
        }
      }

      await this.triggerNicknameUpdate(targetId, contactType)
      profile = await this.getProfileFromDB(targetId, contactType)

      return profile?.nickname || ''
    } catch (error) {
      log.error('ProfileService:handleGetNickname error:', error)
      return ''
    }
  }

  /**
   * 触发Profile更新（后台更新，需要通知UI）
   */
  private async handleTriggerUpdate(_event: Electron.IpcMainInvokeEvent, params: { targetId: string; strategy: string; contactType: number }): Promise<void> {
    try {
      const { targetId, strategy, contactType } = params
      const cacheKey = `${targetId}_${contactType}_${strategy}`
      if (this.inflightRequests.has(cacheKey)) {
        await this.inflightRequests.get(cacheKey)
        return
      }
      // needNotify=true: 后台更新需要通知UI，因为调用方不会等待结果
      const promise = this.performProfileUpdate(targetId, contactType, strategy, true)
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
  private async performProfileUpdate(targetId: string, contactType: number, strategy: string, needNotify: boolean = false): Promise<void> {
    try {
      if (contactType === 1) {
        await this.updateUserProfile(targetId, strategy, needNotify)
      } else if (contactType === 2) {
        await this.updateGroupProfile(targetId, strategy, needNotify)
      }
    } catch (error) {
      log.error(`ProfileService: 更新失败 ${targetId}:`, error)
    }
  }

  /**
   * 更新用户Profile
   */
  private async updateUserProfile(targetId: string, strategy: string, needNotify: boolean): Promise<void> {
    const metaJson = await this.getUserMetaJson(targetId)
    if (metaJson.nickname) {
      await this.updateNicknameInDB(targetId, 1, {
        nickname: metaJson.nickname as string,
        nickVersion: (metaJson.nickVersion as string) || '0'
      })
      if (needNotify) {
        this.notifyProfileUpdated(targetId, 1, 'nickname', metaJson.nickname as string)
      }
    }

    const avatarUrl = metaJson[strategy] as string
    if (avatarUrl) {
      const filePath = await this.downloadAndSaveAvatar(targetId, 1, strategy, avatarUrl)
      if (needNotify && filePath) {
        this.notifyProfileUpdated(targetId, 1, strategy, urlUtil.signByApp('avatar', filePath))
      }
    }
  }
  /**
   * 更新群组Profile
   */
  private async updateGroupProfile(targetId: string, strategy: string, needNotify: boolean): Promise<void> {
    const groupInfo = await this.getGroupInfo(targetId)
    log.info('ProfileService:updateGroupProfile', targetId, groupInfo)
    if (groupInfo.nickname){
      await this.updateNicknameInDB(targetId, 2, {
        nickname: groupInfo.nickname,
        nickVersion: '1'
      })
      if (needNotify) {
        this.notifyProfileUpdated(targetId, 2, 'nickname', groupInfo.nickname)
      }
    }
    if (groupInfo.avatar) {
      const filePath = await this.downloadAndSaveAvatar(targetId, 2, strategy, groupInfo.avatar)
      if (needNotify && filePath) {
        this.notifyProfileUpdated(targetId, 2, strategy, urlUtil.signByApp('avatar', filePath))
      }
    }
  }
  /**
   * 获取用户元信息JSON
   */
  private async getUserMetaJson(userId: string): Promise<Record<string, unknown>> {
    const cacheKey = `user_meta_${userId}`
    const cached = this.memoryCache.get(cacheKey) as any
    if (cached) {
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
    const cacheKey = `group_info_${groupId}`
    const cached = this.memoryCache.get(cacheKey) as any
    if (cached) {
      return cached.data
    }

    try {
      log.info(`ProfileService:getGroupInfo: 获取群组信息 ${groupId}`)
      const response = await netMaster.post('/group/base-info-list', { targetList: [groupId] })
      const result = response.data

      if (result.success && result.data && result.data.groupInfoList && result.data.groupInfoList.length > 0) {
        this.memoryCache.set(cacheKey, {
          data: result.data.groupInfoList[0],
          timestamp: Date.now()
        } as any)
        setTimeout(() => this.memoryCache.delete(cacheKey), this.MEMORY_TTL)
        return result.data.groupInfoList[0]
      }

      return null
    } catch (error) {
      log.error(`ProfileService:getGroupInfo: 获取群组信息失败 ${groupId}:`, error)
      return null
    }
  }
  /**
   * 下载并保存头像
   */
  private async downloadAndSaveAvatar(targetId: string, contactType: number, strategy: string, avatarUrl: string): Promise<string> {
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
        return filePath
      }
    } catch (error) {
      log.error(`ProfileService: 头像下载失败 ${targetId}:`, error)
    }
    return ''
  }

  /**
   * 触发头像更新（主动请求路径，不需要通知）
   */
  private async triggerAvatarUpdate(targetId: string, contactType: number, strategy: string): Promise<void> {
    // needNotify=false: 主动请求路径，调用方会等待结果，不需要额外通知
    await this.performProfileUpdate(targetId, contactType, strategy, false)
  }

  /**
   * 触发昵称更新（主动请求路径，不需要通知）
   */
  private async triggerNicknameUpdate(targetId: string, contactType: number): Promise<void> {
    // needNotify=false: 主动请求路径，调用方会等待结果，不需要额外通知
    await this.performProfileUpdate(targetId, contactType, 'nickname', false)
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
        nickname: profile.nickname || '',
        nickVersion: profile.nickVersion || '0',
        avatarVersion: profile.avatarVersion || '0',
        avatarOriginalPath: profile.avatarOriginalPath || '',
        avatarThumbPath: profile.avatarThumbPath || '',
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
  private async updateNicknameInDB(targetId: string, contactType: number, data: { nickname: string; nickVersion: string }): Promise<void> {
    try {
      await profileDao.upsertNickname(targetId, contactType, { nickname: data.nickname, nickVersion: data.nickVersion })
      log.info(`ProfileService: 昵称更新成功 ${targetId}: ${data.nickname}`)
    } catch (error) {
      log.error('ProfileService:updateNicknameInDB error:', error)
    }
  }
  /**
   * 更新数据库中的头像信息
   */
  private async updateAvatarInDB(targetId: string, contactType: number, data: { strategy: string; version: string; localPath: string }): Promise<void> {
    try {
      const { strategy, version, localPath } = data
      await profileDao.upsertAvatar(targetId, contactType, { strategy, version, localPath })
      log.info(`ProfileService: 头像路径更新成功 ${targetId}: ${localPath}`)
    } catch (error) {
      log.error('ProfileService:updateAvatarInDB error:', error)
    }
  }
  /**
   * 通知渲染进程Profile已更新
   */
  private notifyProfileUpdated(targetId: string, contactType: number, strategy: string, metaInfo: string): void {
    try {
      const window = BrowserWindow.getAllWindows().at(0)
      if (window) {
        window.webContents.send('profile-updated', {
          targetId,
          contactType,
          strategy,
          metaInfo,
        })
      }

      log.info(`ProfileService: 通知UI更新 ${targetId}_${contactType}_${strategy}: ${metaInfo}`)
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
