package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskPredictionResponse {
    /** e.g. "HIGH_DIABETES_RISK", "MODERATE_HYPERTENSION_RISK", "LOW_RISK" */
    private String riskLevel;
    /** 0.0 – 1.0 confidence from the model */
    private Double riskScore;
    /** Short friendly explanation generated from the score */
    private String explanation;
    /** The raw output labels + probabilities from HuggingFace */
    private Map<String, Double> rawScores;
    private LocalDateTime predictedAt;
}
