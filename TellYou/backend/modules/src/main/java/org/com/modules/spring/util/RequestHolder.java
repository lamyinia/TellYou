package org.com.modules.spring.util;

import lombok.Data;

/**
 * 请求上下文
 * @author lanye
 * @date 2025/07/30
 */
public class RequestHolder {
    public static final ThreadLocal<ReqInfo> threadLocal = new ThreadLocal<>();

    public static void set(ReqInfo info){
        threadLocal.set(info);
    }
    public static ReqInfo get(){
        return threadLocal.get();
    }
    public static void remove(){
        threadLocal.remove();
    }


    @Data
    public static class ReqInfo {
        private Long uid;
        private String ip;
    }
}
