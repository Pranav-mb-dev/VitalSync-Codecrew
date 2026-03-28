package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.SosAlertResponse;
import com.healthcare.vitalsync.dto.SosTriggerRequest;
import com.healthcare.vitalsync.services.SosAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sos")
@RequiredArgsConstructor
public class SosAlertController {

    private final SosAlertService sosAlertService;

    /** Manually trigger an SOS alert (patient hits the big red button) */
    @PostMapping("/trigger")
    public ResponseEntity<SosAlertResponse> trigger(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody(required = false) SosTriggerRequest request) {
        if (request == null) request = new SosTriggerRequest();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sosAlertService.triggerSos(userDetails.getUsername(), request));
    }

    /** Caregiver resolves an SOS alert */
    @PatchMapping("/{id}/resolve")
    public ResponseEntity<SosAlertResponse> resolve(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        return ResponseEntity.ok(sosAlertService.resolveAlert(id));
    }

    /** Get SOS history for the current user */
    @GetMapping("/history")
    public ResponseEntity<List<SosAlertResponse>> history(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(sosAlertService.getHistory(userDetails.getUsername()));
    }
}
