package org.com.gate.domain.auth;

/**
 * 认证异常
 */
public class AuthenticationException extends RuntimeException {

    public AuthenticationException(String message) {
        super(message);
    }
}
