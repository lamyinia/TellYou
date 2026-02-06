package org.com.starter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@ComponentScan({"org.com.modules", "org.com.starter", "org.com.tools"})
@EnableScheduling
@EnableConfigurationProperties
@EnableTransactionManagement
@EnableMongoRepositories
@EnableAspectJAutoProxy(proxyTargetClass = true, exposeProxy = true)
public class StarterApplication {
    public static void main(String[] args) {
        try {
            Class<?> optionClass = Class.forName("io.vavr.control.Option");
            System.err.println("[startup] io.vavr.control.Option loaded from: " + optionClass.getProtectionDomain().getCodeSource().getLocation());
        } catch (ClassNotFoundException e) {
            System.err.println("[startup] io.vavr.control.Option not present on classpath");
        }
        SpringApplication.run(StarterApplication.class, args);
    }
}
