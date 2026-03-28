package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.DietRequest;
import com.healthcare.vitalsync.dto.DietResponse;
import com.healthcare.vitalsync.services.DietService;
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
@RequestMapping("/api/diet")
@RequiredArgsConstructor
public class DietController {

    private final DietService dietService;

    @PostMapping
    public ResponseEntity<DietResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody DietRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dietService.create(userDetails.getUsername(), request));
    }

    @PostMapping(value = "/scan", consumes = "multipart/form-data")
    public ResponseEntity<List<DietResponse>> scanDietChart(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(dietService.scanDietChart(userDetails.getUsername(), file));
    }

    @PostMapping("/generate")
    public ResponseEntity<List<DietResponse>> generateDietPlan(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(dietService.generateDietPlan(userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<DietResponse>> getAll(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(dietService.getAll(userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DietResponse> update(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody DietRequest request) {
        return ResponseEntity.ok(dietService.update(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        dietService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/log")
    public ResponseEntity<Void> logIntake(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam String session) {
        dietService.logIntake(userDetails.getUsername(), id, session);
        return ResponseEntity.ok().build();
    }
}
