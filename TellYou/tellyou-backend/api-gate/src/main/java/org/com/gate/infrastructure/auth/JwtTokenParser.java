package org.com.gate.infrastructure.auth;

import io.jsonwebtoken.Claims;
import org.com.shared.infrastructure.jwt.JwtRsaKeys;
import org.com.shared.infrastructure.jwt.JwtRsaTokenCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.PublicKey;

/**
 * JWT Token解析器
 */
@Component
public class JwtTokenParser {
    
    @Value("${jwt.public-key:}")
    private String publicKeyPem;

    @Value("${jwt.public-key-path:}")
    private String publicKeyPath;

    private volatile PublicKey cachedPublicKey;
    
    public Claims parseToken(String token) {
        PublicKey publicKey = getPublicKey();
        return JwtRsaTokenCodec.parseClaims(publicKey, token);
    }

    private PublicKey getPublicKey() {
        PublicKey key = cachedPublicKey;
        if (key != null) {
            return key;
        }
        synchronized (this) {
            if (cachedPublicKey == null) {
                cachedPublicKey = JwtRsaKeys.loadPublicKey(publicKeyPem, publicKeyPath);
            }
            return cachedPublicKey;
        }
    }
}
