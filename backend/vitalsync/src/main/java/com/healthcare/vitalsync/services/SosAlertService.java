package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.SosAlertResponse;
import com.healthcare.vitalsync.dto.SosTriggerRequest;
import com.healthcare.vitalsync.entities.FamilyLink;
import com.healthcare.vitalsync.entities.SosAlert;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.FamilyLinkRepository;
import com.healthcare.vitalsync.repositories.SosAlertRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SosAlertService {

    private final SosAlertRepository sosAlertRepository;
    private final FamilyLinkRepository familyLinkRepository;
    private final UserRepository userRepository;
    private final CareContextService careContextService;

    @Transactional
    public SosAlertResponse triggerSos(String email, SosTriggerRequest request) {
        User patient = getUser(email);
        String reason = (request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason()
                : "Manual SOS";

        SosAlert alert = SosAlert.builder()
                .user(patient)
                .triggerReason(reason)
                .triggerType(SosAlert.TriggerType.MANUAL)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();
        sosAlertRepository.save(alert);

        notifyCaregivers(patient, reason);

        return toResponse(alert);
    }

    @Transactional
    public SosAlertResponse triggerAutomaticSos(User patient, String reason,
                                                SosAlert.TriggerType type,
                                                Double lat, Double lon) {
        SosAlert alert = SosAlert.builder()
                .user(patient)
                .triggerReason(reason)
                .triggerType(type)
                .latitude(lat)
                .longitude(lon)
                .build();
        sosAlertRepository.save(alert);
        notifyCaregivers(patient, reason);
        return toResponse(alert);
    }

    @Transactional
    public SosAlertResponse resolveAlert(UUID alertId) {
        SosAlert alert = sosAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("SOS alert not found"));
        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        return toResponse(sosAlertRepository.save(alert));
    }

    public List<SosAlertResponse> getHistory(String email) {
        User user = careContextService.resolveDataOwner(email);
        return sosAlertRepository.findByUserOrderByTriggeredAtDesc(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private void notifyCaregivers(User patient, String reason) {
        List<FamilyLink> links = familyLinkRepository.findByPatient(patient)
                .stream()
                .filter(l -> l.getStatus() == FamilyLink.Status.ACTIVE && l.getCaregiver() != null)
                .toList();

        for (FamilyLink link : links) {
            User caregiver = link.getCaregiver();
            // Originally notified caregiver via FCM here.
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private SosAlertResponse toResponse(SosAlert a) {
        return SosAlertResponse.builder()
                .id(a.getId())
                .userId(a.getUser().getId())
                .triggerReason(a.getTriggerReason())
                .triggerType(a.getTriggerType().name())
                .latitude(a.getLatitude())
                .longitude(a.getLongitude())
                .resolved(a.isResolved())
                .resolvedAt(a.getResolvedAt())
                .triggeredAt(a.getTriggeredAt())
                .build();
    }
}
