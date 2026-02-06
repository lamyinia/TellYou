package org.com.shared.infrastructure.id;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SnowflakeIdConfiguration {

    @Bean
    public SnowflakeIdGenerator snowflakeIdGenerator(
            @Value("${id.snowflake.datacenter-id:0}") long datacenterId,
            @Value("${id.snowflake.worker-id:0}") long workerId
    ) {
        return new SnowflakeIdGenerator(datacenterId, workerId);
    }
}
