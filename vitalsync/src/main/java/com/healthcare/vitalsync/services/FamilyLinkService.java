package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.FamilyLinkResponse;
import com.healthcare.vitalsync.entities.FamilyLink;
import com.healthcare.vitalsync.entities.Profile;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.FamilyLinkRepository;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FamilyLinkService {

    private final FamilyLinkRepository familyLinkRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Patient generates an invite code so a caregiver can link to them */
    @Transactional
    public FamilyLinkResponse generateInvite(String patientEmail) {
        User patient = getUser(patientEmail);
        String code = ensurePatientPairCode(patient);

        FamilyLink link = familyLinkRepository.findByPatient(patient).stream()
                .filter(existing -> existing.getStatus() == FamilyLink.Status.PENDING)
                .findFirst()
                .orElseGet(() -> FamilyLink.builder()
                        .patient(patient)
                        .status(FamilyLink.Status.PENDING)
                        .build());

        link.setInviteCode(code);
        return toResponse(familyLinkRepository.save(link));
    }

    /** Caregiver accepts the invite code to link themselves to the patient */
    @Transactional
    public FamilyLinkResponse acceptInvite(String caregiverEmail, String inviteCode) {
        User caregiver = getUser(caregiverEmail);
        FamilyLink link = familyLinkRepository.findByInviteCode(inviteCode)
                .orElseGet(() -> userRepository.findByPairCode(inviteCode)
                        .map(patient -> familyLinkRepository.findByPatient(patient).stream()
                                .filter(existing -> existing.getStatus() == FamilyLink.Status.PENDING)
                                .findFirst()
                                .orElseGet(() -> FamilyLink.builder()
                                        .patient(patient)
                                        .inviteCode(inviteCode)
                                        .status(FamilyLink.Status.PENDING)
                                        .build()))
                        .orElseThrow(() -> new IllegalArgumentException("Invalid invite code")));

        if (link.getStatus() != FamilyLink.Status.PENDING) {
            throw new IllegalStateException("Invite code is no longer valid");
        }

        link.setCaregiver(caregiver);
        link.setStatus(FamilyLink.Status.ACTIVE);
        return toResponse(familyLinkRepository.save(link));
    }

    /** Get all family links visible to the authenticated user */
    @Transactional(readOnly = true)
    public List<FamilyLinkResponse> getMyLinks(String email) {
        User user = getUser(email);
        List<FamilyLink> asPatient = familyLinkRepository.findByPatient(user);
        List<FamilyLink> asCaregiver = familyLinkRepository.findByCaregiver(user);
        return java.util.stream.Stream.concat(asPatient.stream(), asCaregiver.stream())
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public String ensurePatientPairCode(User patient) {
        if (patient.getPairCode() != null && !patient.getPairCode().isBlank()) {
            return patient.getPairCode();
        }

        String code = generateUniqueCode();
        patient.setPairCode(code);
        userRepository.save(patient);
        return code;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (userRepository.existsByPairCode(code));
        return code;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        return sb.toString();
    }

    private FamilyLinkResponse toResponse(FamilyLink link) {
        Profile patientProfile = profileRepository.findByUser(link.getPatient()).orElse(null);
        Profile caregiverProfile = link.getCaregiver() != null
                ? profileRepository.findByUser(link.getCaregiver()).orElse(null)
                : null;
        return FamilyLinkResponse.builder()
                .id(link.getId())
                .patientId(link.getPatient().getId())
                .patientName(patientProfile != null ? patientProfile.getFullName() : "")
                .patientEmail(link.getPatient().getEmail())
                .caregiverId(link.getCaregiver() != null ? link.getCaregiver().getId() : null)
                .caregiverName(caregiverProfile != null ? caregiverProfile.getFullName() : "")
                .caregiverEmail(link.getCaregiver() != null ? link.getCaregiver().getEmail() : "")
                .inviteCode(link.getInviteCode())
                .status(link.getStatus().name())
                .createdAt(link.getCreatedAt())
                .build();
    }
}
