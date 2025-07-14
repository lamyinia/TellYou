package org.com.server;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.common.properties.NettyProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@Slf4j
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ServerApplicationTests {
    @Autowired
    private NettyProperties nettyProperties;

    @Test
    void contextLoads() {
        long port = nettyProperties.getPort();
        System.out.println(port);
    }

}
