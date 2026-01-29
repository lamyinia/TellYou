package org.com.shared.infrastructure.nacos;

/**
 * 服务发现异常
 *
 * @author lanye
 */
public class ServiceDiscoveryException extends RuntimeException {

    public ServiceDiscoveryException(String message) {
        super(message);
    }

    public ServiceDiscoveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
