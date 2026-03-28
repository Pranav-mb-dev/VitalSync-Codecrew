package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.AppointmentRequest;
import com.healthcare.vitalsync.dto.AppointmentResponse;
import com.healthcare.vitalsync.services.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @PostMapping
    public ResponseEntity<AppointmentResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.create(userDetails.getUsername(), request));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(appointmentService.getAll(userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.update(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        appointmentService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
