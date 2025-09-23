import { net } from 'electron'
import { store } from '../index'
import { tokenKey } from '@main/electron-store/key'

const getApiConfig = (): { baseUrl: string; token: string } => {
  const baseUrl = import.meta.env.VITE_REQUEST_URL
  const token = store.get(tokenKey) as string
  return { baseUrl, token }
}
export const getUploadUrl = async (fileSize: number, fileSuffix: string): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> => {
  const { baseUrl, token } = getApiConfig()

  const request = net.request({
    method: 'GET',
    url: `${baseUrl}/media/avatar/upload-url?fileSize=${fileSize}&fileSuffix=${fileSuffix}`,
    headers: {
      'token': token,
      'Content-Type': 'application/json'
    }
  })
  return new Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }>((resolve, reject) => {
    let responseData = ''
    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })
      response.on('end', () => {
        try {
          const data = JSON.parse(responseData)
          if (response.statusCode === 200 && data.success === true) {
            resolve(data.data)
          } else {
            reject(new Error(data.errMsg || `获取上传URL失败，状态码: ${response.statusCode}`))
          }
        } catch (error) {
          console.error('JSON解析错误:', error)
          reject(new Error(`解析响应数据失败: ${(error as Error).message}`))
        }
      })
    })
    request.on('error', (error) => {
      reject(error)
    })
    request.end()
  })
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
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType
      },
      body: fileBuffer
    })

    console.log('上传响应状态码:', response.status)
    console.log('上传响应头:', Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      console.log('上传成功')
      return
    } else {
      const responseText = await response.text()
      console.log('上传失败响应:', responseText)
      throw new Error(`上传失败，状态码: ${response.status}, 响应: ${responseText}`)
    }
  } catch (error) {
    console.error('上传请求错误:', error)
    throw error
  }
}
export const confirmUpload = async (): Promise<void> => {
  const { baseUrl, token } = getApiConfig()

  const request = net.request({
    method: 'POST',
    url: `${baseUrl}/media/avatar/upload-confirm`,
    headers: {
      'token': token,
      'Content-Type': 'application/json'
    }
  })

  return new Promise<void>((resolve, reject) => {
    let responseData = ''

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString()
      })
      response.on('end', () => {
        try {
          if (response.statusCode === 200) {
            if (responseData) {
              const data = JSON.parse(responseData)
              if (data.success === true) {
                resolve()
              } else {
                reject(new Error(data.errMsg || '确认上传失败'))
              }
            } else {
              resolve()
            }
          } else {
            reject(new Error(`确认上传失败，状态码: ${response.statusCode}`))
          }
        } catch (error) {
          console.error('确认上传JSON解析错误:', error)
          reject(new Error(`确认上传解析响应失败: ${(error as Error).message}`))
        }
      })
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.end()
  })
}
