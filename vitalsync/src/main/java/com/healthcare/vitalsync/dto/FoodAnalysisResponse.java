package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodAnalysisResponse {
    /** What the AI thinks the food is */
    private String detectedFood;
    /** Estimated macros */
    private String estimatedCalories;
    private String protein;
    private String carbohydrates;
    private String fats;
    /** Alerts based on the patient's medical conditions */
    private String medicalAlert;
    /** Full Gemini response summary */
    private String summary;
}
