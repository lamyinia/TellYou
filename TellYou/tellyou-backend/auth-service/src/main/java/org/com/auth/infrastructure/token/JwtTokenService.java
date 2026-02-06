package org.com.auth.infrastructure.token;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.com.shared.infrastructure.jwt.JwtRsaKeys;
import org.com.shared.infrastructure.jwt.JwtRsaTokenCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.PrivateKey;
import java.security.PublicKey;

@Component
public class JwtTokenService {

    @Value("${jwt.private-key:}")
    private String privateKeyPem;

    @Value("${jwt.private-key-path:}")
    private String privateKeyPath;

    @Value("${jwt.public-key:}")
    private String publicKeyPem;

    @Value("${jwt.public-key-path:}")
    private String publicKeyPath;

    @Value("${jwt.uid-key:uid}")
    private String uidKey;

    @Value("${jwt.ttl-millis:604800000}")
    private long ttlMillis;

    private volatile PrivateKey cachedPrivateKey;
    private volatile PublicKey cachedPublicKey;

    public String createToken(Long userId) {
        PrivateKey privateKey = getPrivateKey();
        return JwtRsaTokenCodec.createToken(privateKey, uidKey, userId, ttlMillis);
    }

    public Long parseUserId(String token) {
        Claims claims = parseClaims(token);
        return claims.get(uidKey, Long.class);
    }

    public boolean isValid(String token) {
        try {
            Long userId = parseUserId(token);
            return userId != null && userId > 0;
        } catch (ExpiredJwtException e) {
            return false;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        PublicKey publicKey = getPublicKey();
        return JwtRsaTokenCodec.parseClaims(publicKey, token);
    }

    private PrivateKey getPrivateKey() {
        PrivateKey key = cachedPrivateKey;
        if (key != null) {
            return key;
        }
        synchronized (this) {
            if (cachedPrivateKey == null) {
                cachedPrivateKey = JwtRsaKeys.loadPrivateKey(privateKeyPem, privateKeyPath);
            }
            return cachedPrivateKey;
        }
    }

    private PublicKey getPublicKey() {
        PublicKey key = cachedPublicKey;
        if (key != null) {
            return key;
        }
        synchronized (this) {
            if (cachedPublicKey == null) {
                if (publicKeyPem != null && !publicKeyPem.isBlank() || publicKeyPath != null && !publicKeyPath.isBlank()) {
                    cachedPublicKey = JwtRsaKeys.loadPublicKey(publicKeyPem, publicKeyPath);
                } else {
                    cachedPublicKey = JwtRsaKeys.derivePublicKey(getPrivateKey());
                }
            }
            return cachedPublicKey;
        }
    }
}
