import { netMaster, netMinIO } from '../util/net-util'
import { Api } from '@main/service/proxy-service'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'
import urlUtil from '@main/util/url-util'

export const getUploadUrl = async (fileSize: number, fileSuffix: string): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> => {
  const response = await netMaster.post(Api.GET_AVATAR_UPLOAD_URL, { fileSize, fileSuffix } )
  return response.data.data
}
export const uploadFile = async (uploadUrl: string, fileBuffer: Buffer, mimeType: string): Promise<void> => {
  console.log('上传URL:', uploadUrl)
  console.log('文件大小:', fileBuffer.length)
  console.log('MIME类型:', mimeType)
  try {
    new URL(uploadUrl)
  } catch {
    throw new Error(`无效的上传URL: ${uploadUrl}`)
  }
  try {
    const response = await netMinIO.getAxiosInstance().put(uploadUrl, fileBuffer,
      { headers: { 'Content-Type': mimeType, 'Content-Length': fileBuffer.length.toString(),'Connection': 'close'} })
    console.log('上传响应:', response)
    if (response.status >= 200 && response.status < 300) {
      return
    } else {
      throw new Error(`上传失败，状态码: ${response.status}`)
    }
  } catch (error) {
    console.error('上传请求错误:', error)
    throw error
  }
}
export const confirmUpload = async (uploadUrls: any): Promise<void> => {
  await netMaster.post(Api.CONFIRM_UPLOAD, {
    fromId: store.get(uidKey),
    originalUploadUrl: urlUtil.extractObjectName(uploadUrls.originalUploadUrl),
    thumbnailUploadUrl: urlUtil.extractObjectName(uploadUrls.thumbnailUploadUrl)
  })
}
