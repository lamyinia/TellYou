package org.com.tools.properties;

import lombok.Data;
import lombok.ToString;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "tell-you.minio")
@ToString
public class MinioProperties {

    private String endpoint;

    private String accessKey;

    private String secretKey;

    private String bucket;
}
