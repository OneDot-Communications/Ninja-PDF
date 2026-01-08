package com._pluspdf._plus_pdf_backend.auth.controller;

import com._pluspdf._plus_pdf_backend.auth.model.dto.*;
import com._pluspdf._plus_pdf_backend.auth.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @Value("${cookie.secure:false}")
    private boolean secureCookie;

    @Value("${cookie.same-site:Lax}")
    private String sameSite;

    /**
     * POST /api/auth/signup
     * Register a new user account
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.signup(request);
            setAuthCookies(response, authResponse);
            return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
        } catch (RuntimeException e) {
            log.error("Signup failed: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("signup_failed", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/login
     * Authenticate user and return JWT tokens
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {
        try {
            AuthResponse authResponse = authService.login(request);

            // Check if 2FA is required
            if (authResponse.isRequires2fa()) {
                return ResponseEntity.ok(authResponse);
            }

            setAuthCookies(response, authResponse);
            return ResponseEntity.ok(authResponse);

        } catch (RuntimeException e) {
            log.error("Login failed for {}: {}", request.getEmail(), e.getMessage());

            // Handle specific error cases
            String errorCode = "login_failed";
            HttpStatus status = HttpStatus.UNAUTHORIZED;

            if (e.getMessage().contains("locked")) {
                errorCode = "account_locked";
                status = HttpStatus.LOCKED;
            } else if (e.getMessage().contains("not verified")) {
                errorCode = "email_not_verified";
                status = HttpStatus.FORBIDDEN;
            }

            return ResponseEntity.status(status)
                    .body(ErrorResponse.of(errorCode, e.getMessage()));
        }
    }

    /**
     * POST /api/auth/refresh
     * Refresh the access token using refresh token
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @RequestBody(required = false) RefreshTokenRequest request,
            @CookieValue(name = "refresh_token", required = false) String cookieRefreshToken,
            HttpServletResponse response) {
        try {
            // Try to get refresh token from request body first, then cookie
            String refreshToken = (request != null && request.getRefreshToken() != null)
                    ? request.getRefreshToken()
                    : cookieRefreshToken;

            if (refreshToken == null || refreshToken.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ErrorResponse.of("invalid_request", "Refresh token is required"));
            }

            AuthResponse authResponse = authService.refreshToken(refreshToken);
            setAuthCookies(response, authResponse);
            return ResponseEntity.ok(authResponse);

        } catch (RuntimeException e) {
            log.error("Token refresh failed: {}", e.getMessage());
            clearAuthCookies(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("invalid_token", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/logout
     * Logout user and clear cookies
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        clearAuthCookies(response);
        return ResponseEntity.ok().body(new MessageResponse("Logged out successfully"));
    }

    private void setAuthCookies(HttpServletResponse response, AuthResponse authResponse) {
        // Access token cookie (shorter expiry)
        Cookie accessCookie = new Cookie("access_token", authResponse.getAccessToken());
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(secureCookie);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(authResponse.getExpiresIn().intValue());
        response.addCookie(accessCookie);

        // Refresh token cookie (longer expiry)
        Cookie refreshCookie = new Cookie("refresh_token", authResponse.getRefreshToken());
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(secureCookie);
        refreshCookie.setPath("/api/auth/refresh");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(refreshCookie);

        // Set SameSite attribute via header (Servlet Cookie doesn't support SameSite directly)
        response.addHeader("Set-Cookie",
                String.format("access_token=%s; HttpOnly; %sPath=/; Max-Age=%d; SameSite=%s",
                        authResponse.getAccessToken(),
                        secureCookie ? "Secure; " : "",
                        authResponse.getExpiresIn(),
                        sameSite));
    }

    private void clearAuthCookies(HttpServletResponse response) {
        Cookie accessCookie = new Cookie("access_token", "");
        accessCookie.setHttpOnly(true);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);
        response.addCookie(accessCookie);

        Cookie refreshCookie = new Cookie("refresh_token", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/api/auth/refresh");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);
    }

    // Simple DTO for refresh token request
    @lombok.Data
    public static class RefreshTokenRequest {
        private String refreshToken;
    }

    // Simple message response
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class MessageResponse {
        private String message;
    }
}
