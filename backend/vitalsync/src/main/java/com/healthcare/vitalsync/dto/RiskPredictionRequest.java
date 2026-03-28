package com.healthcare.vitalsync.dto;

import lombok.Data;

import java.util.Map;

@Data
public class RiskPredictionRequest {
    /** The patient's UUID (string) */
    private String userId;
    /**
     * Key-value pairs of recent vital readings to feed into the model.
     * Example: {"systolic":140, "diastolic":90, "blood_sugar":180,
     *            "age":68, "bmi":27.5, "heart_rate":88}
     */
    private Map<String, Double> features;
}
