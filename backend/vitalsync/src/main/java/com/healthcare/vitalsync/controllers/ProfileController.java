package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.ProfileRequest;
import com.healthcare.vitalsync.dto.ProfileResponse;
import com.healthcare.vitalsync.services.ProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    public ResponseEntity<ProfileResponse> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(profileService.getProfile(userDetails.getUsername()));
    }

    /** For caregivers: get linked patient's profile. For patients: same as /profile. */
    @GetMapping("/patient")
    public ResponseEntity<ProfileResponse> getPatientProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(profileService.getPatientProfile(userDetails.getUsername()));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(profileService.updateProfile(userDetails.getUsername(), request));
    }

    /** For caregivers: update linked patient's profile. For patients: same as /profile. */
    @PutMapping("/patient")
    public ResponseEntity<ProfileResponse> updatePatientProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ProfileRequest request) {
        return ResponseEntity.ok(profileService.updatePatientProfile(userDetails.getUsername(), request));
    }
}
