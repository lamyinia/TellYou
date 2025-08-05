package org.com.servermodules;

import lombok.RequiredArgsConstructor;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;

@SpringBootTest
@RequiredArgsConstructor
class ServerModulesApplicationTests {
    private final MongoTemplate mongoTemplate;
    @Test
    void contextLoads() {

    }
}
