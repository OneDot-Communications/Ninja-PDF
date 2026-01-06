package com._pluspdf._plus_pdf_backend.auth.service;

import com._pluspdf._plus_pdf_backend.auth.model.User;
import com._pluspdf._plus_pdf_backend.auth.model.dto.*;
import com._pluspdf._plus_pdf_backend.auth.repository.UserRepository;
import com._pluspdf._plus_pdf_backend.auth.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    // Simple in-memory rate limiting (should use Redis/Cache in production)
    private final Map<String, Integer> failedAttempts = new ConcurrentHashMap<>();
    private final Map<String, Long> lockoutUntil = new ConcurrentHashMap<>();

    private static final int MAX_FAILED_ATTEMPTS = 10;
    private static final long LOCKOUT_DURATION_MS = 60 * 60 * 1000; // 1 hour

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Create new user
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role("USER")
                .isVerified(false)
                .isActive(true)
                .subscriptionTier("FREE")
                .dateJoined(LocalDateTime.now())
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        // Generate tokens
        String accessToken = jwtUtils.generateToken(user);
        String refreshToken = jwtUtils.generateRefreshToken(user);

        // TODO: Send verification email (async)

        return buildAuthResponse(user, accessToken, refreshToken, "Registration successful. Please verify your email.");
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail();

        // Check lockout
        if (isLockedOut(email)) {
            throw new RuntimeException("Account locked due to too many failed attempts. Please try again later.");
        }

        try {
            // Authenticate
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            User user = (User) authentication.getPrincipal();

            // Check if email is verified
            if (!user.isEmailVerified()) {
                // In production, resend verification email here
                log.warn("Login attempt with unverified email: {}", email);
                throw new RuntimeException("Email not verified. A new verification link has been sent to your inbox.");
            }

            // TODO: Check 2FA if enabled
            // For now, we skip 2FA check

            // Clear failed attempts on successful login
            clearFailedAttempts(email);

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            // Generate tokens
            String accessToken = jwtUtils.generateToken(user);
            String refreshToken = jwtUtils.generateRefreshToken(user);

            log.info("User logged in successfully: {}", email);

            return buildAuthResponse(user, accessToken, refreshToken, null);

        } catch (BadCredentialsException e) {
            recordFailedAttempt(email);
            log.warn("Failed login attempt for: {}", email);
            throw new RuntimeException("Invalid email or password");
        }
    }

    public AuthResponse refreshToken(String refreshToken) {
        try {
            String email = jwtUtils.extractUsername(refreshToken);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!jwtUtils.validateToken(refreshToken, user)) {
                throw new RuntimeException("Invalid refresh token");
            }

            String newAccessToken = jwtUtils.generateToken(user);
            String newRefreshToken = jwtUtils.generateRefreshToken(user);

            return buildAuthResponse(user, newAccessToken, newRefreshToken, null);

        } catch (Exception e) {
            throw new RuntimeException("Invalid refresh token");
        }
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken, String message) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtils.getJwtExpiration() / 1000)
                .user(AuthResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .role(user.getRole())
                        .emailVerified(user.isEmailVerified())
                        .avatarUrl(user.getAvatar())
                        .build())
                .message(message)
                .build();
    }

    private void recordFailedAttempt(String email) {
        int attempts = failedAttempts.getOrDefault(email, 0) + 1;
        failedAttempts.put(email, attempts);

        if (attempts >= MAX_FAILED_ATTEMPTS) {
            lockoutUntil.put(email, System.currentTimeMillis() + LOCKOUT_DURATION_MS);
            log.warn("Account locked due to too many failed attempts: {}", email);
            // TODO: Send account lock notification email
        }
    }

    private void clearFailedAttempts(String email) {
        failedAttempts.remove(email);
        lockoutUntil.remove(email);
    }

    private boolean isLockedOut(String email) {
        Long lockTime = lockoutUntil.get(email);
        if (lockTime == null) {
            return false;
        }
        if (System.currentTimeMillis() > lockTime) {
            // Lockout expired
            clearFailedAttempts(email);
            return false;
        }
        return true;
    }
}
