package org.com.dispatch;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"org.com.dispatch", "org.com.shared"})
public class MessageDispatchApplication {

    public static void main(String[] args) {
        SpringApplication.run(MessageDispatchApplication.class, args);
    }
}
