package org.com.modules.spring.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.backoff.FixedBackOffPolicy;
import org.springframework.retry.policy.SimpleRetryPolicy;
import org.springframework.retry.support.RetryTemplate;

@Configuration
public class RetryConfig {

    @Bean
    public RetryTemplate retryTemplate() {
        RetryTemplate template = new RetryTemplate();

        // 配置重试策略（最多尝试4次 = 初始调用 + 3次重试）
        SimpleRetryPolicy policy = new SimpleRetryPolicy();
        policy.setMaxAttempts(4);

        // 配置退避策略（每次间隔2秒）
        FixedBackOffPolicy backOffPolicy = new FixedBackOffPolicy();
        backOffPolicy.setBackOffPeriod(2000); // 毫秒

        template.setRetryPolicy(policy);
        template.setBackOffPolicy(backOffPolicy);

        return template;
    }
}
