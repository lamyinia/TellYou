package org.com.tools.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.com.tools.properties.JwtProperties;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Data
@Component
@RequiredArgsConstructor
public class JwtUtil {
    private final JwtProperties jwtProperties;

    public String createJwt(Map<String, Object> claims){
        String secretKey = jwtProperties.getUserSecretKey();
        long ttlMillis = jwtProperties.getUserTtl();

        if (secretKey == null || secretKey.length() < 32) {
            throw new IllegalArgumentException("密钥长度必须≥32字符");
        } else if (ttlMillis <= 0) {
            throw new IllegalArgumentException("有效期必须为正数");
        }

        long expMills = System.currentTimeMillis() + ttlMillis;
        SecretKey key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
        JwtBuilder builder = Jwts.builder()
                .signWith(key)
                .claims(claims)
                .expiration(new Date(expMills));

        return builder.compact();
    }

    public Claims parseJWT(String token){
        String secretKey = jwtProperties.getUserSecretKey();

        SecretKey key = Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));

        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
