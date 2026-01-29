package org.com.auth.application;

import lombok.RequiredArgsConstructor;
import org.com.auth.domain.user.Email;
import org.com.auth.domain.user.Password;
import org.com.auth.domain.user.User;
import org.com.auth.domain.user.UserId;
import org.com.auth.domain.user.UserRepository;
import org.com.auth.infrastructure.grpc.SocialProfileGrpcClient;
import org.com.auth.infrastructure.id.SnowflakeIdGenerator;
import org.com.auth.infrastructure.token.JwtTokenService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthApplicationService {

    private final UserRepository userRepository;
    private final Password.PasswordEncoder passwordEncoder;
    private final SnowflakeIdGenerator idGenerator;
    private final SocialProfileGrpcClient socialProfileGrpcClient;
    private final JwtTokenService jwtTokenService;

    public AuthResult register(String email, String password, String nickName, int sex) {
        Email emailVO = Email.of(email);
        if (userRepository.existsByEmail(emailVO)) {
            throw new IllegalArgumentException("邮箱已经注册");
        }

        long userIdValue = idGenerator.nextId();
        String passwordHash = passwordEncoder.encode(password);

        User user = User.register(UserId.of(userIdValue), emailVO, Password.encrypted(passwordHash));
        userRepository.save(user);

        try {
            boolean success = socialProfileGrpcClient.createDefaultProfile(userIdValue, nickName, sex);
            if (!success){
                throw new RuntimeException("调用错误");
            }
        } catch (Exception e) {
            userRepository.delete(UserId.of(userIdValue));
            throw new RuntimeException("创建默认Profile失败，已回滚user_auth", e);
        }

        String token = jwtTokenService.createToken(userIdValue);
        return new AuthResult(userIdValue, token);
    }

    public AuthResult login(String email, String password) {
        Email emailVO = Email.of(email);
        User user = userRepository.findByEmail(emailVO)
            .orElseThrow(() -> new IllegalArgumentException("用户不存在"));

        boolean ok = user.verifyPassword(password, passwordEncoder);
        if (!ok) {
            throw new IllegalArgumentException("用户密码错误");
        }

        String token = jwtTokenService.createToken(user.getId().getValue());
        return new AuthResult(user.getId().getValue(), token);
    }

    public ValidateResult validateToken(String token) {
        if (!jwtTokenService.isValid(token)) {
            return new ValidateResult(false, 0L);
        }

        Long userId = jwtTokenService.parseUserId(token);
        if (userId == null || userId <= 0) {
            return new ValidateResult(false, 0L);
        }

        return new ValidateResult(true, userId);
    }

    public record AuthResult(long userId, String token) {}

    public record ValidateResult(boolean valid, long userId) {}
}
