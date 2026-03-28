package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.entities.FamilyLink;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.FamilyLinkRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the "data owner" for requests.
 *
 * Patients operate on their own data.
 * Caregivers operate on the linked patient's data (ACTIVE family link).
 */
@Service
@RequiredArgsConstructor
public class CareContextService {

    private final UserRepository userRepository;
    private final FamilyLinkRepository familyLinkRepository;

    @Transactional(readOnly = true)
    public User resolveDataOwner(String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + requesterEmail));

        if (requester.getRole() == User.Role.CAREGIVER) {
            return familyLinkRepository.findByCaregiver(requester).stream()
                    .filter(l -> l.getStatus() == FamilyLink.Status.ACTIVE && l.getPatient() != null)
                    .findFirst()
                    .map(FamilyLink::getPatient)
                    .orElseThrow(() -> new IllegalStateException("No active patient link found for caregiver"));
        }

        return requester;
    }
}
