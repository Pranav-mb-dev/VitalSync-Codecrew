package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private UUID id;
    private UUID userId;
    private String fullName;
    private LocalDate dateOfBirth;
    private String bloodType;
    private String allergies;
    private String medicalConditions;
    private String avatarUrl;
    private String phoneNumber;
    private String language;
    private String email;
    private String role;
    private String pairCode;
    private java.util.List<String> emergencyContacts;
}
