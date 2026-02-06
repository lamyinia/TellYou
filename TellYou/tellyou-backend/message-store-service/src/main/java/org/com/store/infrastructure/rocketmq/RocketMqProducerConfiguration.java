package org.com.store.infrastructure.rocketmq;

import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.client.exception.MQClientException;
import org.apache.rocketmq.client.producer.DefaultMQProducer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class RocketMqProducerConfiguration {

    @Bean(destroyMethod = "shutdown")
    public DefaultMQProducer defaultMQProducer(
            @Value("${rocketmq.producer.group:message-store-producer}") String group,
            @Value("${rocketmq.name-server:localhost:9876}") String nameServer
    ) throws MQClientException {
        DefaultMQProducer producer = new DefaultMQProducer(group);
        producer.setNamesrvAddr(nameServer);
        producer.start();
        log.info("RocketMQ producer started: group={}, nameServer={}", group, nameServer);
        return producer;
    }
}
