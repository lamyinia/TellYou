package org.com.nettyconnector;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"org.com.nettyconnector", "org.com.shared"})
public class NettyConnectorApplication {

    public static void main(String[] args) {
        SpringApplication.run(NettyConnectorApplication.class, args);
    }
}
