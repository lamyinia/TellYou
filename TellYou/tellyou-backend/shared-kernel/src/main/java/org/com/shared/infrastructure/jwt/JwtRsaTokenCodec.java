package org.com.shared.infrastructure.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Date;

public final class JwtRsaTokenCodec {

    private JwtRsaTokenCodec() {
    }

    public static String createToken(PrivateKey privateKey, String uidKey, Long userId, long ttlMillis) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .issuedAt(new Date(now))
            .expiration(new Date(now + ttlMillis))
            .claim(uidKey, userId)
            .signWith(privateKey, Jwts.SIG.RS256)
            .compact();
    }

    public static Claims parseClaims(PublicKey publicKey, String token) {
        return Jwts.parser()
            .verifyWith(publicKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
