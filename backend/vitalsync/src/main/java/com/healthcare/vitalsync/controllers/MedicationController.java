package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.MedicationRequest;
import com.healthcare.vitalsync.dto.MedicationResponse;
import com.healthcare.vitalsync.services.MedicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicationService medicationService;

    @PostMapping
    public ResponseEntity<MedicationResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MedicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(medicationService.create(userDetails.getUsername(), request));
    }

    @PostMapping(value = "/scan", consumes = "multipart/form-data")
    public ResponseEntity<List<MedicationResponse>> scanPrescription(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(medicationService.scanPrescription(userDetails.getUsername(), file));
    }

    @GetMapping
    public ResponseEntity<List<MedicationResponse>> getAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicationService.getAll(userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicationResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody MedicationRequest request) {
        return ResponseEntity.ok(medicationService.update(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        medicationService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    /** Log a dose intake */
    @PostMapping("/{id}/log")
    public ResponseEntity<Void> logIntake(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam String session) {
        medicationService.logIntake(userDetails.getUsername(), id, session);
        return ResponseEntity.ok().build();
    }
}
