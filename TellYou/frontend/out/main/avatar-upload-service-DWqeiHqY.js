"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const index = require("./index.js");
const getApiConfig = () => {
  const baseUrl = "http://localhost:8081";
  const token = index.store.get("token", "");
  return { baseUrl, token };
};
const getUploadUrl = async (fileSize, fileSuffix) => {
  const { baseUrl, token } = getApiConfig();
  const request = electron.net.request({
    method: "GET",
    url: `${baseUrl}/media/avatar/upload-url?fileSize=${fileSize}&fileSuffix=${fileSuffix}`,
    headers: {
      "token": token,
      "Content-Type": "application/json"
    }
  });
  console.log("请求URL:", `${baseUrl}/media/avatar/upload-url?fileSize=${fileSize}&fileSuffix=${fileSuffix}`);
  console.log("请求头:", { token, "Content-Type": "application/json" });
  return new Promise((resolve, reject) => {
    let responseData = "";
    request.on("response", (response) => {
      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        console.log("响应数据:", responseData);
        try {
          const data = JSON.parse(responseData);
          if (response.statusCode === 200 && data.success === true) {
            resolve(data.data);
          } else {
            reject(new Error(data.errMsg || `获取上传URL失败，状态码: ${response.statusCode}`));
          }
        } catch (error) {
          console.error("JSON解析错误:", error);
          reject(new Error(`解析响应数据失败: ${error.message}`));
        }
      });
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.end();
  });
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
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType
      },
      body: fileBuffer
    });
    console.log("上传响应状态码:", response.status);
    console.log("上传响应头:", Object.fromEntries(response.headers.entries()));
    if (response.ok) {
      console.log("上传成功");
      return;
    } else {
      const responseText = await response.text();
      console.log("上传失败响应:", responseText);
      throw new Error(`上传失败，状态码: ${response.status}, 响应: ${responseText}`);
    }
  } catch (error) {
    console.error("上传请求错误:", error);
    throw error;
  }
};
const confirmUpload = async () => {
  const { baseUrl, token } = getApiConfig();
  const request = electron.net.request({
    method: "POST",
    url: `${baseUrl}/media/avatar/upload-confirm`,
    headers: {
      "token": token,
      "Content-Type": "application/json"
    }
  });
  return new Promise((resolve, reject) => {
    let responseData = "";
    request.on("response", (response) => {
      console.log("确认上传响应状态码:", response.statusCode);
      response.on("data", (chunk) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        console.log("确认上传响应数据:", responseData);
        try {
          if (response.statusCode === 200) {
            if (responseData) {
              const data = JSON.parse(responseData);
              if (data.success === true) {
                resolve();
              } else {
                reject(new Error(data.errMsg || "确认上传失败"));
              }
            } else {
              resolve();
            }
          } else {
            reject(new Error(`确认上传失败，状态码: ${response.statusCode}`));
          }
        } catch (error) {
          console.error("确认上传JSON解析错误:", error);
          reject(new Error(`确认上传解析响应失败: ${error.message}`));
        }
      });
    });
    request.on("error", (error) => {
      reject(error);
    });
    request.end();
  });
};
exports.confirmUpload = confirmUpload;
exports.getUploadUrl = getUploadUrl;
exports.uploadFile = uploadFile;
