package com.healthcare.vitalsync.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class MedicationRequest {
    @NotBlank
    private String name;
    private String dosage;
    private String frequency;
    private LocalDate startDate;
    private LocalDate endDate;
    private String instructions;
    private Integer totalDays;
    private Integer daysLeft;
}
