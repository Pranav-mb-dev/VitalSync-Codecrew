package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.VitalReadingRequest;
import com.healthcare.vitalsync.dto.VitalReadingResponse;
import com.healthcare.vitalsync.services.VitalReadingService;
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
@RequestMapping("/api/vitals")
@RequiredArgsConstructor
public class VitalReadingController {

    private final VitalReadingService vitalReadingService;

    @PostMapping
    public ResponseEntity<VitalReadingResponse> record(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VitalReadingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(vitalReadingService.recordVital(userDetails.getUsername(), request));
    }

    /**
     * Get vitals; optionally filter by type (e.g. ?type=BLOOD_PRESSURE)
     */
    @GetMapping
    public ResponseEntity<List<VitalReadingResponse>> getVitals(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(vitalReadingService.getVitals(userDetails.getUsername(), type));
    }

    @PostMapping("/extract")
    public ResponseEntity<VitalReadingRequest> extract(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("photo") MultipartFile photo) {
        return ResponseEntity.ok(vitalReadingService.extractVitalsFromPhoto(userDetails.getUsername(), photo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VitalReadingResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody VitalReadingRequest request) {
        return ResponseEntity.ok(vitalReadingService.updateVital(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        vitalReadingService.deleteVital(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
