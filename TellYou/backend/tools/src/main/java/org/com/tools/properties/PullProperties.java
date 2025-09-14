package org.com.tools.properties;

import lombok.Data;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ToString
@ConfigurationProperties(prefix = "tell-you.pull")
public class PullProperties {
    private Integer pullSize;
    private Boolean isCompress;
}
