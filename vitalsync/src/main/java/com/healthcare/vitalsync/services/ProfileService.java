package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.ProfileRequest;
import com.healthcare.vitalsync.dto.ProfileResponse;
import com.healthcare.vitalsync.entities.Profile;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final UserRepository userRepository;
    private final CareContextService careContextService;
    private final UserPreferenceService userPreferenceService;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String email) {
        User user = getUser(email);
        Profile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new IllegalStateException("Profile not found"));
        return toResponse(profile);
    }

    /**
     * For caregivers: returns the linked patient's profile.
     * For patients: returns their own profile (same as getProfile).
     */
    @Transactional(readOnly = true)
    public ProfileResponse getPatientProfile(String email) {
        User owner = careContextService.resolveDataOwner(email);
        Profile profile = profileRepository.findByUser(owner)
                .orElseGet(() -> Profile.builder().user(owner).build());
        return toResponse(profile);
    }

    @Transactional
    public ProfileResponse updateProfile(String email, ProfileRequest request) {
        User user = getUser(email);
        Profile profile = profileRepository.findByUser(user)
                .orElseGet(() -> Profile.builder().user(user).build());

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getDateOfBirth() != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getAllergies() != null) profile.setAllergies(request.getAllergies());
        if (request.getMedicalConditions() != null) profile.setMedicalConditions(request.getMedicalConditions());
        if (request.getAvatarUrl() != null) profile.setAvatarUrl(request.getAvatarUrl());
        if (request.getPhoneNumber() != null) profile.setPhoneNumber(request.getPhoneNumber());
        if (request.getLanguage() != null) user.setLanguage(userPreferenceService.normalizeLanguageCode(request.getLanguage()));
        if (request.getEmergencyContacts() != null) profile.setEmergencyContacts(request.getEmergencyContacts());

        userRepository.save(user);
        return toResponse(profileRepository.save(profile));
    }

    /**
     * For caregivers: updates the linked patient's profile.
     * For patients: updates their own profile.
     */
    @Transactional
    public ProfileResponse updatePatientProfile(String email, ProfileRequest request) {
        User owner = careContextService.resolveDataOwner(email);
        Profile profile = profileRepository.findByUser(owner)
                .orElseGet(() -> Profile.builder().user(owner).build());

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getDateOfBirth() != null) profile.setDateOfBirth(request.getDateOfBirth());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getAllergies() != null) profile.setAllergies(request.getAllergies());
        if (request.getMedicalConditions() != null) profile.setMedicalConditions(request.getMedicalConditions());
        if (request.getAvatarUrl() != null) profile.setAvatarUrl(request.getAvatarUrl());
        if (request.getPhoneNumber() != null) profile.setPhoneNumber(request.getPhoneNumber());
        if (request.getLanguage() != null) owner.setLanguage(userPreferenceService.normalizeLanguageCode(request.getLanguage()));
        if (request.getEmergencyContacts() != null) profile.setEmergencyContacts(request.getEmergencyContacts());

        userRepository.save(owner);
        return toResponse(profileRepository.save(profile));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private ProfileResponse toResponse(Profile p) {
        return ProfileResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .fullName(p.getFullName())
                .dateOfBirth(p.getDateOfBirth())
                .bloodType(p.getBloodType())
                .allergies(p.getAllergies())
                .medicalConditions(p.getMedicalConditions())
                .avatarUrl(p.getAvatarUrl())
                .phoneNumber(p.getPhoneNumber())
                .language(userPreferenceService.resolveLanguageCode(p.getUser()))
                .email(p.getUser().getEmail())
                .role(p.getUser().getRole().name())
                .emergencyContacts(p.getEmergencyContacts())
                .build();
    }
}
