package org.com.modules.common.interceptor;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.tools.utils.JwtUtil;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenInterceptor implements HandlerInterceptor {
    public static final String ATTRIBUTE_UID = "uid";

    public final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!(handler instanceof HandlerMethod)){
            return true;
        }

        String token = request.getHeader(jwtUtil.getJwtProperties().getUserTokenName());
        if (token == null || token.isBlank()){
            response.setStatus(401);
            response.getWriter().write("Missing authorization token");
            return false;
        }

        try {
            String attributeKey = jwtUtil.getJwtProperties().getUidKey();
            log.info("JWT验证 - 令牌: {}...", token.substring(0, Math.min(token.length(), 6)));
            Claims claims = jwtUtil.parseJWT(token);
            request.setAttribute(ATTRIBUTE_UID, (Long) claims.get(attributeKey));

            return true;
        } catch (ExpiredJwtException ex){
            log.warn("JWT已过期: {}", ex.getMessage());
            response.setStatus(401);
            response.getWriter().write("Token expired");

            return false;
        } catch (JwtException | IllegalArgumentException ex){
            log.warn("无效JWT: {}", ex.getMessage());
            response.setStatus(401);
            response.getWriter().write("Invalid token");

            return false;
        }
    }
}
