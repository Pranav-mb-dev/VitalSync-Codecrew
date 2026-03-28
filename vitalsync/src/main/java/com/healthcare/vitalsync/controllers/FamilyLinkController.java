package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.FamilyLinkResponse;
import com.healthcare.vitalsync.services.FamilyLinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family")
@RequiredArgsConstructor
public class FamilyLinkController {

    private final FamilyLinkService familyLinkService;

    /** Patient calls this to generate an invite code */
    @PostMapping("/invite")
    public ResponseEntity<FamilyLinkResponse> generateInvite(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(familyLinkService.generateInvite(userDetails.getUsername()));
    }

    /** Caregiver calls this with the code to link to the patient */
    @PostMapping("/accept")
    public ResponseEntity<FamilyLinkResponse> acceptInvite(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String code) {
        return ResponseEntity.ok(familyLinkService.acceptInvite(userDetails.getUsername(), code));
    }

    /** Get all family links for the current user (both as patient and as caregiver) */
    @GetMapping("/members")
    public ResponseEntity<List<FamilyLinkResponse>> getMembers(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(familyLinkService.getMyLinks(userDetails.getUsername()));
    }
}
