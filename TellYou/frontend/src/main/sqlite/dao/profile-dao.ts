/* eslint-disable */
import { queryOne, queryAll, insertOrReplace, update } from "../atom"
import log from "electron-log"

/**
 * Profile数据访问对象
 * 负责用户和群组的头像、昵称数据的CRUD操作
 * 
 * @author lanye
 * @since 2025/10/29
 */

interface ProfileEntity {
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

interface NicknameUpdateData {
  nickname: string
  nickVersion: string
}

interface AvatarUpdateData {
  strategy: string  // 'originalAvatarUrl' | 'thumbedAvatarUrl'
  version: string
  localPath: string
}

class ProfileDao {
  /**
   * 根据targetId和contactType查询Profile
   */
  public async selectProfile(targetId: string, contactType: number): Promise<ProfileEntity | null> {
    try {
      const sql = `
        SELECT * FROM profiles 
        WHERE target_id = ? AND contact_type = ?
      `
      
      const row = await queryOne(sql, [targetId, contactType])
      if (!row) return null
      
      // atom.ts已经处理了驼峰转换，直接返回
      return row as unknown as ProfileEntity
    } catch (error) {
      log.error('ProfileDao:selectProfile error:', error)
      return null
    }
  }

  /**
   * 插入新的Profile记录
   */
  public async insertProfile(profile: Partial<ProfileEntity>): Promise<number> {
    try {
      const now = Date.now()
      
      // 使用atom.ts封装的insertOrReplace方法
      const profileData = {
        targetId: profile.targetId,
        contactType: profile.contactType,
        nickname: profile.nickname || null,
        nickVersion: profile.nickVersion || '0',
        avatarVersion: profile.avatarVersion || '0',
        avatarOriginalPath: profile.avatarOriginalPath || null,
        avatarThumbPath: profile.avatarThumbPath || null,
        lastNickUpdate: profile.lastNickUpdate || now,
        lastAvatarUpdate: profile.lastAvatarUpdate || now,
        createdAt: profile.createdAt || now
      }
      
      const result = await insertOrReplace('profiles', profileData)
      
      log.info(`ProfileDao: 插入Profile成功 ${profile.targetId}`)
      return result
    } catch (error) {
      log.error('ProfileDao:insertProfile error:', error)
      return 0
    }
  }

  /**
   * 更新昵称信息
   */
  public async updateNickname(
    targetId: string, 
    contactType: number, 
    data: NicknameUpdateData
  ): Promise<number> {
    try {
      const now = Date.now()
      
      // 使用atom.ts封装的update方法
      const updateData = {
        nickname: data.nickname,
        nickVersion: data.nickVersion,
        lastNickUpdate: now
      }
      
      const whereData = {
        targetId,
        contactType
      }
      
      const result = await update('profiles', updateData, whereData)
      
      log.info(`ProfileDao: 昵称更新成功 ${targetId}: ${data.nickname}`)
      return result
    } catch (error) {
      log.error('ProfileDao:updateNickname error:', error)
      return 0
    }
  }

  /**
   * 更新头像信息
   */
  public async updateAvatar(
    targetId: string,
    contactType: number,
    data: AvatarUpdateData
  ): Promise<number> {
    try {
      const now = Date.now()
      
      // 使用atom.ts封装的update方法
      const updateData: any = {
        avatarVersion: data.version,
        lastAvatarUpdate: now
      }
      
      // 根据策略设置对应的路径字段
      if (data.strategy === 'thumbedAvatarUrl') {
        updateData.avatarThumbPath = data.localPath
      } else {
        updateData.avatarOriginalPath = data.localPath
      }
      
      const whereData = {
        targetId,
        contactType
      }
      
      const result = await update('profiles', updateData, whereData)
      
      log.info(`ProfileDao: 头像更新成功 ${targetId}: ${data.localPath}`)
      return result
    } catch (error) {
      log.error('ProfileDao:updateAvatar error:', error)
      return 0
    }
  }

  /**
   * 插入或更新Profile (UPSERT操作)
   */
  public async upsertProfile(profile: Partial<ProfileEntity>): Promise<number> {
    try {
      const existing = await this.selectProfile(profile.targetId!, profile.contactType!)
      
      if (existing) {
        // 更新现有记录
        return await this.updateProfilePartial(profile.targetId!, profile.contactType!, profile)
      } else {
        // 插入新记录
        return await this.insertProfile(profile)
      }
    } catch (error) {
      log.error('ProfileDao:upsertProfile error:', error)
      return 0
    }
  }

  /**
   * 插入或替换昵称信息 (专用于昵称更新)
   */
  public async upsertNickname(
    targetId: string,
    contactType: number,
    data: NicknameUpdateData
  ): Promise<number> {
    try {
      const now = Date.now()
      
      // 使用atom.ts封装的insertOrReplace方法
      const profileData = {
        targetId,
        contactType,
        nickname: data.nickname,
        nickVersion: data.nickVersion,
        lastNickUpdate: now,
        createdAt: now
      }
      
      const result = await insertOrReplace('profiles', profileData)
      
      log.info(`ProfileDao: 昵称upsert成功 ${targetId}: ${data.nickname}`)
      return result
    } catch (error) {
      log.error('ProfileDao:upsertNickname error:', error)
      return 0
    }
  }

  /**
   * 插入或更新头像信息 (专用于头像更新)
   */
  public async upsertAvatar(
    targetId: string,
    contactType: number,
    data: AvatarUpdateData
  ): Promise<number> {
    try {
      const existing = await this.selectProfile(targetId, contactType)
      const now = Date.now()
      
      if (existing) {
        // 更新现有记录
        return await this.updateAvatar(targetId, contactType, data)
      } else {
        // 创建新记录，使用insertOrReplace
        const profileData: any = {
          targetId,
          contactType,
          avatarVersion: data.version,
          lastAvatarUpdate: now,
          createdAt: now
        }
        
        // 根据策略设置对应的路径字段
        if (data.strategy === 'thumbedAvatarUrl') {
          profileData.avatarThumbPath = data.localPath
        } else {
          profileData.avatarOriginalPath = data.localPath
        }
        
        const result = await insertOrReplace('profiles', profileData)
        
        log.info(`ProfileDao: 头像insert成功 ${targetId}: ${data.localPath}`)
        return result
      }
    } catch (error) {
      log.error('ProfileDao:upsertAvatar error:', error)
      return 0
    }
  }

  /**
   * 部分更新Profile字段
   */
  private async updateProfilePartial(
    targetId: string,
    contactType: number,
    updates: Partial<ProfileEntity>
  ): Promise<number> {
    try {
      // 过滤掉undefined的字段
      const updateData: any = {}
      
      if (updates.nickname !== undefined) updateData.nickname = updates.nickname
      if (updates.nickVersion !== undefined) updateData.nickVersion = updates.nickVersion
      if (updates.avatarVersion !== undefined) updateData.avatarVersion = updates.avatarVersion
      if (updates.avatarOriginalPath !== undefined) updateData.avatarOriginalPath = updates.avatarOriginalPath
      if (updates.avatarThumbPath !== undefined) updateData.avatarThumbPath = updates.avatarThumbPath
      if (updates.lastNickUpdate !== undefined) updateData.lastNickUpdate = updates.lastNickUpdate
      if (updates.lastAvatarUpdate !== undefined) updateData.lastAvatarUpdate = updates.lastAvatarUpdate
      
      if (Object.keys(updateData).length === 0) {
        log.warn('ProfileDao:updateProfilePartial 没有字段需要更新')
        return 0
      }
      
      const whereData = {
        targetId,
        contactType
      }
      
      const result = await update('profiles', updateData, whereData)
      log.info(`ProfileDao: 部分更新成功 ${targetId}`)
      return result
    } catch (error) {
      log.error('ProfileDao:updateProfilePartial error:', error)
      return 0
    }
  }


  /**
   * 批量查询多个Profile
   */
  public async selectProfiles(targets: Array<{targetId: string, contactType: number}>): Promise<ProfileEntity[]> {
    if (targets.length === 0) return []
    
    try {
      // 构建IN查询
      const conditions = targets.map(() => '(target_id = ? AND contact_type = ?)').join(' OR ')
      const params = targets.flatMap(t => [t.targetId, t.contactType])
      
      const sql = `SELECT * FROM profiles WHERE ${conditions}`
      const rows = await queryAll(sql, params)
      
      if (!rows || rows.length === 0) return []
      
      // atom.ts已经处理了驼峰转换，直接返回
      return rows as unknown as ProfileEntity[]
    } catch (error) {
      log.error('ProfileDao:selectProfiles error:', error)
      return []
    }
  }
}

const profileDao = new ProfileDao()
export default profileDao