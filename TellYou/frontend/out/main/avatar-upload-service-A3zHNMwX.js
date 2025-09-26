"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const getApiConfig = () => {
  const baseUrl = "http://localhost:8081";
  return { baseUrl };
};
const getUploadUrl = async (fileSize, fileSuffix) => {
  const { baseUrl } = getApiConfig();
  const response = await index.netMaster.get(`${baseUrl}/media/avatar/upload-url`, {
    params: {
      fileSize,
      fileSuffix
    }
  });
  return response.data;
};
const uploadFile = async (uploadUrl, fileBuffer, mimeType) => {
  console.log("上传URL:", uploadUrl);
  console.log("文件大小:", fileBuffer.length);
  console.log("MIME类型:", mimeType);
  try {
    new URL(uploadUrl);
  } catch {
    throw new Error(`无效的上传URL: ${uploadUrl}`);
  }
  try {
    const response = await index.netMinIO.getAxiosInstance().put(uploadUrl, fileBuffer, {
      headers: {
        "Content-Type": mimeType
      }
    });
    console.log("上传响应状态码:", response.status);
    console.log("上传响应头:", response.headers);
    if (response.status >= 200 && response.status < 300) {
      console.log("上传成功");
      return;
    } else {
      throw new Error(`上传失败，状态码: ${response.status}`);
    }
  } catch (error) {
    console.error("上传请求错误:", error);
    throw error;
  }
};
const confirmUpload = async () => {
  const { baseUrl } = getApiConfig();
  await index.netMaster.post(`${baseUrl}/media/avatar/upload-confirm`);
};
exports.confirmUpload = confirmUpload;
exports.getUploadUrl = getUploadUrl;
exports.uploadFile = uploadFile;
