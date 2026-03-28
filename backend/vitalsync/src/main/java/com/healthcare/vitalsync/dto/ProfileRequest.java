package com.healthcare.vitalsync.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProfileRequest {
    private String fullName;
    private LocalDate dateOfBirth;
    private String bloodType;
    private String allergies;
    private String medicalConditions;
    private String avatarUrl;
    private String phoneNumber;
    private String language;
    private java.util.List<String> emergencyContacts;
}
