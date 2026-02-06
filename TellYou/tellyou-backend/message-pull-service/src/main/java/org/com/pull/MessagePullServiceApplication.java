package org.com.pull;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("org.com.pull.infrastructure.persistence.mapper")
public class MessagePullServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessagePullServiceApplication.class, args);
    }
}
