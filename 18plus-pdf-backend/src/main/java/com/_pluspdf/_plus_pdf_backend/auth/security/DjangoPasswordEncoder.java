package com._pluspdf._plus_pdf_backend.auth.security;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

/**
 * Password encoder compatible with Django's PBKDF2-SHA256 password hasher.
 * Django password format: pbkdf2_sha256$<iterations>$<salt>$<hash>
 */
@Component
public class DjangoPasswordEncoder implements PasswordEncoder {

    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int DEFAULT_ITERATIONS = 870000; // Django 4.x default
    private static final int KEY_LENGTH = 256;

    @Override
    public String encode(CharSequence rawPassword) {
        // Generate a new password hash in Django format
        try {
            SecureRandom random = new SecureRandom();
            byte[] salt = new byte[16];
            random.nextBytes(salt);
            String saltBase64 = Base64.getEncoder().encodeToString(salt);
            
            byte[] hash = pbkdf2(rawPassword.toString(), salt, DEFAULT_ITERATIONS, KEY_LENGTH);
            String hashBase64 = Base64.getEncoder().encodeToString(hash);
            
            return String.format("pbkdf2_sha256$%d$%s$%s", DEFAULT_ITERATIONS, saltBase64, hashBase64);
        } catch (Exception e) {
            throw new RuntimeException("Error encoding password", e);
        }
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || rawPassword == null) {
            return false;
        }

        // Handle Django's PBKDF2-SHA256 format
        if (encodedPassword.startsWith("pbkdf2_sha256$")) {
            return matchesDjango(rawPassword.toString(), encodedPassword);
        }

        // Handle BCrypt (for new passwords created by Spring)
        if (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$")) {
            return matchesBCrypt(rawPassword.toString(), encodedPassword);
        }

        return false;
    }

    private boolean matchesDjango(String rawPassword, String encodedPassword) {
        try {
            String[] parts = encodedPassword.split("\\$");
            if (parts.length != 4) {
                return false;
            }

            // parts[0] = "pbkdf2_sha256"
            int iterations = Integer.parseInt(parts[1]);
            String saltBase64 = parts[2];
            String expectedHashBase64 = parts[3];

            // Django uses raw salt string, not Base64 decoded
            // The salt is stored as-is (could be alphanumeric string)
            byte[] salt = saltBase64.getBytes("UTF-8");
            
            byte[] computedHash = pbkdf2(rawPassword, salt, iterations, KEY_LENGTH);
            String computedHashBase64 = Base64.getEncoder().encodeToString(computedHash);

            return constantTimeEquals(expectedHashBase64, computedHashBase64);
        } catch (Exception e) {
            // If parsing fails, try alternate salt interpretation
            return matchesDjangoAlternateSalt(rawPassword, encodedPassword);
        }
    }

    private boolean matchesDjangoAlternateSalt(String rawPassword, String encodedPassword) {
        try {
            String[] parts = encodedPassword.split("\\$");
            if (parts.length != 4) {
                return false;
            }

            int iterations = Integer.parseInt(parts[1]);
            String saltString = parts[2];
            String expectedHashBase64 = parts[3];

            // Try Base64 decoded salt
            byte[] salt;
            try {
                salt = Base64.getDecoder().decode(saltString);
            } catch (IllegalArgumentException e) {
                // Salt is not Base64, use as raw string
                salt = saltString.getBytes("UTF-8");
            }

            byte[] computedHash = pbkdf2(rawPassword, salt, iterations, KEY_LENGTH);
            String computedHashBase64 = Base64.getEncoder().encodeToString(computedHash);

            return constantTimeEquals(expectedHashBase64, computedHashBase64);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean matchesBCrypt(String rawPassword, String encodedPassword) {
        try {
            org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder bcrypt = 
                new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            return bcrypt.matches(rawPassword, encodedPassword);
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] pbkdf2(String password, byte[] salt, int iterations, int keyLength) 
            throws NoSuchAlgorithmException, InvalidKeySpecException {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, keyLength);
        SecretKeyFactory factory = SecretKeyFactory.getInstance(ALGORITHM);
        return factory.generateSecret(spec).getEncoded();
    }

    /**
     * Constant-time string comparison to prevent timing attacks
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
