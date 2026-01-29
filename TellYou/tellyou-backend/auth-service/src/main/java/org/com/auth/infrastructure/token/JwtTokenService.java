package org.com.auth.infrastructure.token;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtTokenService {

    @Value("${jwt.secret:default-secret-key-change-in-production}")
    private String secret;

    @Value("${jwt.uid-key:uid}")
    private String uidKey;

    @Value("${jwt.ttl-millis:604800000}")
    private long ttlMillis;

    public String createToken(Long userId) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        long now = System.currentTimeMillis();

        return Jwts.builder()
            .issuedAt(new Date(now))
            .expiration(new Date(now + ttlMillis))
            .claim(uidKey, userId)
            .signWith(key)
            .compact();
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
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
