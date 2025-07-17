import { ElMessage, MessageOptions } from 'element-plus';

type MessageType = 'error' | 'success' | 'warning';
type MessageCallback = (() => void) | undefined;

const showMessage = (msg: string, callback: MessageCallback, type: MessageType): void => {
  const options: MessageOptions = {
    type,
    message: msg,
    duration: 2000,
    onClose: () => {
      callback?.();
    }
  };
  ElMessage(options);
};

interface MessageMethods {
  error: (msg: string, callback?: () => void) => void;
  success: (msg: string, callback?: () => void) => void;
  warning: (msg: string, callback?: () => void) => void;
}

const message: MessageMethods = {
  error: (msg, callback) => showMessage(msg, callback, 'error'),
  success: (msg, callback) => showMessage(msg, callback, 'success'),
  warning: (msg, callback) => showMessage(msg, callback, 'warning'),
};

export default message;
