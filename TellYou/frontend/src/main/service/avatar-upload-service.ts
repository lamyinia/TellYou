import { netMaster } from '../util/net-util'
import { Api } from '@main/service/proxy-service'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'
import urlUtil from '@main/util/url-util'

export const getUploadUrl = async (fileSize: number, fileSuffix: string): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> => {
  const response = await netMaster.post(Api.GET_AVATAR_UPLOAD_URL, { fileSize, fileSuffix } )
  return response.data.data
}
export const confirmUpload = async (uploadUrls: any): Promise<void> => {
  await netMaster.post(Api.CONFIRM_UPLOAD, {
    fromId: store.get(uidKey),
    originalUploadUrl: urlUtil.extractObjectName(uploadUrls.originalUploadUrl),
    thumbnailUploadUrl: urlUtil.extractObjectName(uploadUrls.thumbnailUploadUrl)
  })
}
