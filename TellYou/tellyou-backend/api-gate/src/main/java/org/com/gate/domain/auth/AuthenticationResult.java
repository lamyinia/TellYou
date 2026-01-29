package org.com.gate.domain.auth;

import java.util.Objects;

/**
 * 认证结果值对象
 */
public class AuthenticationResult {
    private final boolean valid;
    private final Long userID;
    private final String errorMessage;

    private AuthenticationResult(boolean valid, Long userID, String errorMessage) {
        this.valid = valid;
        this.userID = userID;
        this.errorMessage = errorMessage;
    }

    public static AuthenticationResult success(Long userId) {
        return new AuthenticationResult(true, userId, null);
    }

    public static AuthenticationResult failure(String errorMessage) {
        return new AuthenticationResult(false, null, errorMessage);
    }

    public boolean isValid() {
        return valid;
    }

    public Long getUserID() {
        return userID;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AuthenticationResult that = (AuthenticationResult) o;
        return valid == that.valid && Objects.equals(userID, that.userID) && Objects.equals(errorMessage, that.errorMessage);
    }

    @Override
    public int hashCode() {
        return Objects.hash(valid, userID, errorMessage);
    }
}
