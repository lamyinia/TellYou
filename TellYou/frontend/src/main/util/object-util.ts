class ObjectUtil {
  public getContentByMessage(msg: any): string {
    if (msg.messageType === "text") return msg.content || "";
    if (msg.messageType === "image") return "[图片]";
    if (msg.messageType === "voice") return "[语音]";
    if (msg.messageType === "video") return "[视频]";
    if (msg.messageType === "file") return "[文件]";
    return "未知";
  }

  public getContentByRow(msg: any): string {
    if (msg.msgType === 1) return msg.text || "";
    if (msg.msgType === 2) return "[图片]";
    if (msg.msgType === 3) return "[语音]";
    if (msg.msgType === 4) return "[视频]";
    if (msg.msgType === 5) return "[文件]";
    return "未知";
  }

  public errorResponse(e: any): any {
    if (e?.name === "ApiError") {
      // 不要把原始 Error 往渲染进程扔, 将错误扁平化为可序列化对象
      return {
        success: false,
        errCode: e.errCode ?? -1,
        errMsg: e.errMsg ?? "请求失败",
      };
    }
    return {
      success: false,
      errCode: -1,
      errMsg: e?.message || "网络或系统异常",
    };
  }
}
const objectUtil = new ObjectUtil();
export default objectUtil;
