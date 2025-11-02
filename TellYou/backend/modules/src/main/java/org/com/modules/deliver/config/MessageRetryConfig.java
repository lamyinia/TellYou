package org.com.modules.deliver.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 消息重试配置类
 * 
 * @author lanye
 * @date 2025/11/03
 */
@Data
@Component
@ConfigurationProperties(prefix = "tell-you.retry")
public class MessageRetryConfig {
    
    /**
     * 缓存过期时间（秒）
     */
    private int cacheExpire = 30;
    
    /**
     * 缓存最大容量
     */
    private int maximumSize = 10000;
    
    /**
     * 最大重试次数
     */
    private int maxRetryCount = 3;
    
    /**
     * 重试等待时间数组（秒）
     */
    private List<Integer> retryWaitingByCount = List.of(1, 2, 4, 8);
}
