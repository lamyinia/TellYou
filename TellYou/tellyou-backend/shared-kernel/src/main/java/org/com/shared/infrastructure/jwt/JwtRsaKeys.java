package org.com.shared.infrastructure.jwt;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPrivateCrtKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

public final class JwtRsaKeys {

    private static final String CLASSPATH_PREFIX = "classpath:";

    private JwtRsaKeys() {
    }

    public static PrivateKey loadPrivateKey(String privateKeyPemOrNull, String privateKeyPathOrNull) {
        String pem = firstNonBlank(privateKeyPemOrNull, readPemFromLocation(privateKeyPathOrNull));
        if (pem == null) {
            throw new IllegalArgumentException("Missing RSA private key (jwt.private-key or jwt.private-key-path)");
        }
        return parsePrivateKeyPem(pem);
    }

    public static PublicKey loadPublicKey(String publicKeyPemOrNull, String publicKeyPathOrNull) {
        String pem = firstNonBlank(publicKeyPemOrNull, readPemFromLocation(publicKeyPathOrNull));
        if (pem == null) {
            throw new IllegalArgumentException("Missing RSA public key (jwt.public-key or jwt.public-key-path)");
        }
        return parsePublicKeyPem(pem);
    }

    public static PublicKey derivePublicKey(PrivateKey privateKey) {
        if (privateKey instanceof RSAPrivateCrtKey crt) {
            try {
                RSAPublicKeySpec spec = new RSAPublicKeySpec(crt.getModulus(), crt.getPublicExponent());
                return KeyFactory.getInstance("RSA").generatePublic(spec);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to derive RSA public key from private key", e);
            }
        }
        throw new IllegalArgumentException("PrivateKey does not expose CRT parameters; please configure jwt.public-key or jwt.public-key-path");
    }

    public static PrivateKey parsePrivateKeyPem(String pem) {
        try {
            String body = stripPemHeaders(pem);
            byte[] der = Base64.getMimeDecoder().decode(body);
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid RSA private key PEM", e);
        }
    }

    public static PublicKey parsePublicKeyPem(String pem) {
        try {
            String body = stripPemHeaders(pem);
            byte[] der = Base64.getMimeDecoder().decode(body);
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid RSA public key PEM", e);
        }
    }

    private static String readPemFromLocation(String locationOrNull) {
        if (locationOrNull == null || locationOrNull.isBlank()) {
            return null;
        }

        if (locationOrNull.startsWith(CLASSPATH_PREFIX)) {
            String res = locationOrNull.substring(CLASSPATH_PREFIX.length());
            try (InputStream is = Thread.currentThread().getContextClassLoader().getResourceAsStream(res)) {
                if (is == null) {
                    throw new IllegalArgumentException("Classpath resource not found: " + locationOrNull);
                }
                return new String(is.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new IllegalArgumentException("Failed to read classpath key: " + locationOrNull, e);
            }
        }

        try {
            return Files.readString(Path.of(locationOrNull), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalArgumentException("Failed to read key file: " + locationOrNull, e);
        }
    }

    private static String stripPemHeaders(String pem) {
        String normalized = pem
            .replace("\r", "")
            .replaceAll("-----BEGIN ([A-Z ]+)-----", "")
            .replaceAll("-----END ([A-Z ]+)-----", "")
            .replace("\n", "")
            .trim();
        return normalized;
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        if (b != null && !b.isBlank()) {
            return b;
        }
        return null;
    }
}
