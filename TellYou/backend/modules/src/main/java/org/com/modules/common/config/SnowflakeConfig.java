package org.com.modules.common.config;

import org.com.modules.common.util.SnowFlakeUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SnowflakeConfig {

    @Bean
    public SnowFlakeUtil snowFlakeUtil(@Value("${tell-you.snowflake.datacenter-id:1}") long datacenterId,
                                       @Value("${tell-you.snowflake.worker-id:1}") long workerId) {
        return new SnowFlakeUtil(datacenterId, workerId);
    }
}
