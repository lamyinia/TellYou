package org.com.starter.netty.properties;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Data
@Component
public class NettyProperties {
    @Value("${tell-you.netty.port}")
    private int serverPort;
}
