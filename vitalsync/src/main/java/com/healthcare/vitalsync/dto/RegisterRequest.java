package com.healthcare.vitalsync.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank
    private String fullName;

    /** PATIENT or CAREGIVER */
    @NotBlank
    private String role;

    /**
     * Required for CAREGIVER sign up: patient's invite code (pairing code).
     * Patients can leave it empty.
     */
    private String pairCode;

    /** Preferred UI/AI language: en, hi, ta, te, kn */
    private String language;
}
