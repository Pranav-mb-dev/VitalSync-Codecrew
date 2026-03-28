package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.*;
import com.healthcare.vitalsync.entities.Profile;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import com.healthcare.vitalsync.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final FamilyLinkService familyLinkService;
    private final UserPreferenceService userPreferenceService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role. Use PATIENT or CAREGIVER");
        }

        if (role == User.Role.CAREGIVER) {
            if (request.getPairCode() == null || request.getPairCode().isBlank()) {
                throw new IllegalArgumentException("Pair code is required for caregiver sign up");
            }
        }

        // Save User locally — no Supabase Auth network call needed
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .language(userPreferenceService.normalizeLanguageCode(request.getLanguage()))
                .build();
        user = userRepository.save(user);

        Profile profile = Profile.builder()
                .user(user)
                .fullName(request.getFullName())
                .build();
        profileRepository.save(profile);

        // If caregiver: accept patient's invite code to establish monitoring link.
        if (role == User.Role.PATIENT) {
            user.setPairCode(familyLinkService.ensurePatientPairCode(user));
            user = userRepository.save(user);
        }

        if (role == User.Role.CAREGIVER) {
            familyLinkService.acceptInvite(user.getEmail(), request.getPairCode().trim());
        }

        // Generate local JWT
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("role", user.getRole().name());
        String token = jwtService.generateToken(claims, userDetails);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(profile.getFullName())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // Authenticate via Spring Security (bcrypt check against local DB)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Load user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Profile profile = profileRepository.findByUser(user).orElse(null);

        // Generate local JWT
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("role", user.getRole().name());
        String token = jwtService.generateToken(claims, userDetails);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(profile != null ? profile.getFullName() : "")
                .build();
    }

    public void logout(String token) {
        // Local JWT auth — nothing to invalidate server-side.
        // Client discards the token.
        log.debug("Logout requested for token (stateless — client discards).");
    }
}
