class ObjectUtil {
  public getContentByMessage(msg: any): string {
    if (msg.messageType === 'text') return msg.content || '';
    if (msg.messageType === 'image') return '[图片]';
    if (msg.messageType === 'voice') return '[语音]'
    if (msg.messageType === 'video') return '[视频]'
    if (msg.messageType === 'file') return '[文件]'
    return '未知'
  }

  public getContentByRow(msg: any): string {
    if (msg.msgType === 1) return msg.text || '';
    if (msg.msgType === 2) return '[图片]';
    if (msg.msgType === 3) return '[语音]'
    if (msg.msgType === 4) return '[视频]'
    if (msg.msgType === 5) return '[文件]'
    return '未知'
  }
}
const objectUtil = new ObjectUtil();
export default objectUtil;
