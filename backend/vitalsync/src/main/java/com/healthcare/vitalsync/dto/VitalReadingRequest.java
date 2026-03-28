package com.healthcare.vitalsync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VitalReadingRequest {
    @NotBlank
    private String type;         // e.g. "BLOOD_PRESSURE"
    @NotNull
    private Double value;
    private Double secondaryValue; // BP diastolic
    private String unit;
    private LocalDateTime measuredAt;
    private String notes;
}
