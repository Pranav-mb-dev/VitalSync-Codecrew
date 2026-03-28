package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.HealthReportResponse;
import com.healthcare.vitalsync.services.HealthReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class HealthReportController {

    private final HealthReportService healthReportService;

    /**
     * Upload a medical report image/PDF.
     * The file bytes are sent to Supabase Storage and then Gemini Vision analysis.
     *
     * @param file    The actual image bytes (sent as multipart)
     */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<HealthReportResponse> upload(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(
                healthReportService.uploadAndAnalyze(userDetails.getUsername(), file)
        );
    }

    @GetMapping
    public ResponseEntity<List<HealthReportResponse>> getReports(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(healthReportService.getReports(userDetails.getUsername()));
    }
}
