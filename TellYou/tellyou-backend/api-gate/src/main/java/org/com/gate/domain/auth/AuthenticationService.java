package org.com.gate.domain.auth;

/**
 * 认证服务接口（领域层）
 */
public interface AuthenticationService {
    
    /**
     * 认证Token
     */
    AuthenticationResult authenticate(String token);
}
