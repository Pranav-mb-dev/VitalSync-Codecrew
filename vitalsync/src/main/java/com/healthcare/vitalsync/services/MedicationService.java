package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.MedicationRequest;
import com.healthcare.vitalsync.dto.MedicationResponse;
import com.healthcare.vitalsync.entities.Medication;
import com.healthcare.vitalsync.entities.MedicationLog;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.MedicationLogRepository;
import com.healthcare.vitalsync.repositories.MedicationRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
    private final UserRepository userRepository;
    private final CareContextService careContextService;

    @Transactional
    public MedicationResponse create(String email, MedicationRequest request) {
        User user = careContextService.resolveDataOwner(email);
        Medication med = Medication.builder()
                .user(user)
                .name(request.getName())
                .dosage(request.getDosage())
                .frequency(request.getFrequency())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .instructions(request.getInstructions())
                .build();
        return toResponse(medicationRepository.save(med));
    }

    public List<MedicationResponse> getAll(String email) {
        User user = careContextService.resolveDataOwner(email);
        return medicationRepository.findByUser(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public MedicationResponse update(String email, UUID medId, MedicationRequest request) {
        Medication med = getOwnedMedication(email, medId);
        if (request.getName() != null) med.setName(request.getName());
        if (request.getDosage() != null) med.setDosage(request.getDosage());
        if (request.getFrequency() != null) med.setFrequency(request.getFrequency());
        if (request.getStartDate() != null) med.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) med.setEndDate(request.getEndDate());
        if (request.getInstructions() != null) med.setInstructions(request.getInstructions());
        return toResponse(medicationRepository.save(med));
    }

    @Transactional
    public void delete(String email, UUID medId) {
        medicationRepository.delete(getOwnedMedication(email, medId));
    }

    /** Patient logs that they took a dose; optionally notify caregiver */
    @Transactional
    public void logIntake(String email, UUID medId) {
        User requester = getUser(email);
        if (requester.getRole() == User.Role.CAREGIVER) {
            throw new SecurityException("Caregivers cannot log daily progress");
        }
        Medication med = getOwnedMedication(email, medId);
        MedicationLog log = MedicationLog.builder()
                .medication(med)
                .takenAt(LocalDateTime.now())
                .build();
        medicationLogRepository.save(log);
    }

    private Medication getOwnedMedication(String email, UUID medId) {
        User user = careContextService.resolveDataOwner(email);
        Medication med = medicationRepository.findById(medId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        if (!med.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied");
        }
        return med;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private MedicationResponse toResponse(Medication m) {
        return MedicationResponse.builder()
                .id(m.getId())
                .name(m.getName())
                .dosage(m.getDosage())
                .frequency(m.getFrequency())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .instructions(m.getInstructions())
                .status(m.getStatus().name())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
