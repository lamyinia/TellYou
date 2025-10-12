"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const index = require("./index.js");
const getUploadUrl = async (fileSize, fileSuffix) => {
  const response = await index.netMaster.post(index.Api.GET_AVATAR_UPLOAD_URL, { fileSize, fileSuffix });
  return response.data.data;
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
