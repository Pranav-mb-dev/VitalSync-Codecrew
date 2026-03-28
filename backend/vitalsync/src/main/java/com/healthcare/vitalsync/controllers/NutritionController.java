package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.GenerateDietPlanFromReportRequest;
import com.healthcare.vitalsync.dto.FoodAnalysisResponse;
import com.healthcare.vitalsync.services.NutritionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService nutritionService;

    /**
     * POST /api/nutrition/analyze
     * Multipart: file (photo of the food)
     *
     * Uses the secondary Gemini key. Alerts are cross-referenced with
     * the patient's stored medical conditions (e.g., diabetes, hypertension).
     */
    @PostMapping(value = "/analyze", consumes = "multipart/form-data")
    public ResponseEntity<FoodAnalysisResponse> analyze(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("photo") MultipartFile photo) {
        return ResponseEntity.ok(nutritionService.analyzeFood(userDetails.getUsername(), photo));
    }

    @GetMapping("/generate")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> generateDietPlan(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(nutritionService.generateDietPlan(userDetails.getUsername()));
    }

    @PostMapping("/generate-from-report")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> generateDietPlanFromReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody GenerateDietPlanFromReportRequest request) {
        return ResponseEntity.ok(
                nutritionService.generateDietPlanFromReport(
                        userDetails.getUsername(),
                        request.getReportId(),
                        request.getMedicalConditions()
                )
        );
    }
}
