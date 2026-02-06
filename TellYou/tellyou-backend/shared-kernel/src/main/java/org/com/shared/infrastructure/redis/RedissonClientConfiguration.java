package org.com.shared.infrastructure.redis;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedissonClientConfiguration {

    @Bean(destroyMethod = "shutdown")
    public RedissonClient redissonClient(
            @Value("${spring.data.redis.host:localhost}") String host,
            @Value("${spring.data.redis.port:6379}") int port,
            @Value("${spring.data.redis.password:}") String password,
            @Value("${spring.data.redis.database:0}") int database
    ) {
        Config config = new Config();
        SingleServerConfig single = config.useSingleServer()
                .setAddress("redis://" + host + ":" + port)
                .setDatabase(database);

        if (password != null && !password.isBlank()) {
            single.setPassword(password);
        }

        return Redisson.create(config);
    }
}
