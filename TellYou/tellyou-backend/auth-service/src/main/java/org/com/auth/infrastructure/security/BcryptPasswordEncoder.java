package org.com.auth.infrastructure.security;

import org.com.auth.domain.user.Password;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BcryptPasswordEncoder implements Password.PasswordEncoder {

    private final BCryptPasswordEncoder delegate = new BCryptPasswordEncoder();

    @Override
    public String encode(String plainPassword) {
        return delegate.encode(plainPassword);
    }

    @Override
    public boolean matches(String plainPassword, String hash) {
        return delegate.matches(plainPassword, hash);
    }
}
