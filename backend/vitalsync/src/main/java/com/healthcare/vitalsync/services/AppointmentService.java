package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.AppointmentRequest;
import com.healthcare.vitalsync.dto.AppointmentResponse;
import com.healthcare.vitalsync.entities.Appointment;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.AppointmentRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final CareContextService careContextService;

    @Transactional
    public AppointmentResponse create(String email, AppointmentRequest request) {
        User user = careContextService.resolveDataOwner(email);
        Appointment appt = Appointment.builder()
                .user(user)
                .title(request.getTitle())
                .doctorName(request.getDoctorName())
                .appointmentDateTime(request.getAppointmentDateTime())
                .location(request.getLocation())
                .notes(request.getNotes())
                .build();
        return toResponse(appointmentRepository.save(appt));
    }

    public List<AppointmentResponse> getAll(String email) {
        User user = careContextService.resolveDataOwner(email);
        return appointmentRepository.findByUserOrderByAppointmentDateTimeAsc(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public AppointmentResponse update(String email, UUID apptId, AppointmentRequest request) {
        Appointment appt = getOwned(email, apptId);
        if (request.getTitle() != null) appt.setTitle(request.getTitle());
        if (request.getDoctorName() != null) appt.setDoctorName(request.getDoctorName());
        if (request.getAppointmentDateTime() != null) appt.setAppointmentDateTime(request.getAppointmentDateTime());
        if (request.getLocation() != null) appt.setLocation(request.getLocation());
        if (request.getNotes() != null) appt.setNotes(request.getNotes());
        return toResponse(appointmentRepository.save(appt));
    }

    @Transactional
    public void delete(String email, UUID apptId) {
        appointmentRepository.delete(getOwned(email, apptId));
    }

    private Appointment getOwned(String email, UUID apptId) {
        User user = careContextService.resolveDataOwner(email);
        Appointment appt = appointmentRepository.findById(apptId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        if (!appt.getUser().getId().equals(user.getId())) throw new SecurityException("Access denied");
        return appt;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .doctorName(a.getDoctorName())
                .appointmentDateTime(a.getAppointmentDateTime())
                .location(a.getLocation())
                .notes(a.getNotes())
                .status(a.getStatus().name())
                .reminderSent(a.isReminderSent())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
