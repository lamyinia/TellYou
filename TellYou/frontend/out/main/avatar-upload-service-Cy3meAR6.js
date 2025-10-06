"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const getUploadUrl = async (fileSize, fileSuffix) => {
  const response = await index.netMaster.post(index.Api.GET_AVATAR_UPLOAD_URL, { fileSize, fileSuffix });
  return response.data.data;
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
    const response = await index.netMinIO.getAxiosInstance().put(
      uploadUrl,
      fileBuffer,
      { headers: { "Content-Type": mimeType, "Content-Length": fileBuffer.length.toString(), "Connection": "close" } }
    );
    console.log("上传响应:", response);
    if (response.status >= 200 && response.status < 300) {
      return;
    } else {
      throw new Error(`上传失败，状态码: ${response.status}`);
    }
  } catch (error) {
    console.error("上传请求错误:", error);
    throw error;
  }
};
const confirmUpload = async (uploadUrls) => {
  await index.netMaster.post(index.Api.CONFIRM_UPLOAD, {
    fromId: index.store.get(index.uidKey),
    originalUploadUrl: index.urlUtil.extractObjectName(uploadUrls.originalUploadUrl),
    thumbnailUploadUrl: index.urlUtil.extractObjectName(uploadUrls.thumbnailUploadUrl)
  });
};
exports.confirmUpload = confirmUpload;
exports.getUploadUrl = getUploadUrl;
exports.uploadFile = uploadFile;
