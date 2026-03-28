package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.RiskPredictionRequest;
import com.healthcare.vitalsync.dto.RiskPredictionResponse;
import com.healthcare.vitalsync.services.PredictiveRiskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
public class PredictiveRiskController {

    private final PredictiveRiskService predictiveRiskService;

    /**
     * POST /api/risk/predict
     * Body: { "features": { "systolic": 148, "diastolic": 95,
     *                        "blood_sugar": 190, "age": 68, "bmi": 28.2 } }
     *
     * The mobile app should gather the last known vitals from the local state
     * and send them here to get a risk prediction + friendly explanation.
     */
    @PostMapping("/predict")
    public ResponseEntity<RiskPredictionResponse> predict(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RiskPredictionRequest request) {
        request.setUserId(userDetails.getUsername());
        return ResponseEntity.ok(predictiveRiskService.predict(request));
    }
}
