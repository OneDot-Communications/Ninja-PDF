package com._pluspdf._plus_pdf_backend.auth.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    // Django stores role as VARCHAR, not enum
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String role = "USER";

    // Django field name is is_verified, not email_verified
    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // Django uses avatar as ImageField
    @Column(name = "avatar")
    private String avatar;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "timezone", length = 50)
    @Builder.Default
    private String timezone = "UTC";

    // Subscription tier
    @Column(name = "subscription_tier", length = 20)
    @Builder.Default
    private String subscriptionTier = "FREE";

    // Ban fields
    @Column(name = "is_banned")
    @Builder.Default
    private Boolean isBanned = false;

    @Column(name = "banned_until")
    private LocalDateTime bannedUntil;

    @Column(name = "ban_reason", columnDefinition = "TEXT")
    private String banReason;

    // 2FA fields
    @Column(name = "is_2fa_enabled")
    @Builder.Default
    private Boolean is2faEnabled = false;

    @Column(name = "totp_secret", length = 100)
    private String totpSecret;

    // Django AbstractUser fields
    @Column(name = "is_staff")
    @Builder.Default
    private Boolean isStaff = false;

    @Column(name = "is_superuser")
    @Builder.Default
    private Boolean isSuperuser = false;

    @Column(name = "date_joined")
    private LocalDateTime dateJoined;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @PrePersist
    protected void onCreate() {
        if (dateJoined == null) {
            dateJoined = LocalDateTime.now();
        }
    }

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        if (isBanned != null && isBanned) {
            return false;
        }
        if (bannedUntil != null && bannedUntil.isAfter(LocalDateTime.now())) {
            return false;
        }
        return isActive == null || isActive;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive == null || isActive;
    }

    public boolean isEmailVerified() {
        return isVerified != null && isVerified;
    }

    public enum Role {
        USER,
        ADMIN,
        SUPER_ADMIN
    }

    public enum SubscriptionTier {
        FREE,
        PRO,
        PREMIUM,
        ENTERPRISE
    }
}
