import { netMaster, netMinIO } from '../util/net-util'

const getApiConfig = (): { baseUrl: string } => {
  const baseUrl = import.meta.env.VITE_REQUEST_URL
  return { baseUrl }
}

export const getUploadUrl = async (
  fileSize: number,
  fileSuffix: string
): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> => {
  const { baseUrl } = getApiConfig()

  const response = await netMaster.get(`${baseUrl}/media/avatar/upload-url`, {
    params: {
      fileSize,
      fileSuffix
    }
  })

  return response.data
}

export const uploadFile = async (
  uploadUrl: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<void> => {
  console.log('上传URL:', uploadUrl)
  console.log('文件大小:', fileBuffer.length)
  console.log('MIME类型:', mimeType)

  try {
    new URL(uploadUrl)
  } catch {
    throw new Error(`无效的上传URL: ${uploadUrl}`)
  }

  try {
    const response = await netMinIO.getAxiosInstance().put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': mimeType
      }
    })

    console.log('上传响应状态码:', response.status)
    console.log('上传响应头:', response.headers)

    if (response.status >= 200 && response.status < 300) {
      console.log('上传成功')
      return
    } else {
      throw new Error(`上传失败，状态码: ${response.status}`)
    }
  } catch (error) {
    console.error('上传请求错误:', error)
    throw error
  }
}

export const confirmUpload = async (): Promise<void> => {
  const { baseUrl } = getApiConfig()

  await netMaster.post(`${baseUrl}/media/avatar/upload-confirm`)
}
