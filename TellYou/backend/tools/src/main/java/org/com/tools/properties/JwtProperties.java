package org.com.tools.properties;

import lombok.Data;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Slf4j
@Data
@Component
@ConfigurationProperties(prefix = "tell-you.jwt")
@ToString
public class JwtProperties {
    private String userSecretKey;
    private String userTokenName;
    private long userTtl;

    private String uidKey;
}
