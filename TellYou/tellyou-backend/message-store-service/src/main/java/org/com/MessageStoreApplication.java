package org.com;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("org.com.store.infrastructure.persistence.mapper")
@EnableScheduling
public class MessageStoreApplication {
    public static void main(String[] args) {
        SpringApplication.run(MessageStoreApplication.class, args);
    }
}
