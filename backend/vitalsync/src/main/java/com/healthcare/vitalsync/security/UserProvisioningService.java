package com.healthcare.vitalsync.security;

import com.healthcare.vitalsync.entities.Profile;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Transactional service to auto-provision users on first login via Supabase.
 * Must be a separate @Service so the @Transactional proxy is applied.
 * Calling @Transactional methods directly on a filter bypasses the proxy.
 */
@Service
@RequiredArgsConstructor
public class UserProvisioningService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    @Transactional
    public UserDetails getOrCreateUser(String email) {
        User appUser = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .id(UUID.randomUUID())
                    .email(email)
                    .passwordHash("") // Supabase handles auth, no local password needed
                    .role(User.Role.PATIENT)
                    .build();
            newUser = userRepository.save(newUser);

            // Create an empty profile so /api/profile always returns something
            Profile profile = Profile.builder()
                    .user(newUser)
                    .fullName(email.split("@")[0]) // Default name from email prefix
                    .build();
            profileRepository.save(profile);

            return newUser;
        });

        return new org.springframework.security.core.userdetails.User(
                appUser.getEmail(),
                appUser.getPasswordHash(),
                List.of(new SimpleGrantedAuthority("ROLE_" + appUser.getRole().name()))
        );
    }
}
