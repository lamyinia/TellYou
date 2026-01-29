package org.com.gate.infrastructure.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.auth.AuthenticationResult;
import org.com.gate.domain.auth.AuthenticationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * JWT认证服务实现
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationService implements AuthenticationService {

    @Value("${jwt.uid-key:uid}")
    private String uidKey;
    private final JwtTokenParser jwtTokenParser;

    @Override
    public AuthenticationResult authenticate(String token) {
        try {
            Claims claims = jwtTokenParser.parseToken(token);
            Long userId = claims.get(uidKey, Long.class);

            if (userId == null) {
                return AuthenticationResult.failure("Token中缺少用户ID");
            }

            return AuthenticationResult.success(userId);
        } catch (ExpiredJwtException e) {
            log.warn("JWT已过期: {}", e.getMessage());
            return AuthenticationResult.failure("Token已过期");
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("无效JWT: {}", e.getMessage());
            return AuthenticationResult.failure("无效Token");
        }
    }
}
