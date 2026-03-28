package com.healthcare.vitalsync.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class GenerateDietPlanFromReportRequest {
    private UUID reportId;
    /** Optional override for medical conditions/disease text */
    private String medicalConditions;
}

