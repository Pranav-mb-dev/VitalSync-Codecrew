package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.RiskPredictionRequest;
import com.healthcare.vitalsync.dto.RiskPredictionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * PredictiveRiskService
 * ─────────────────────
 * Sends a patient's recent vital features to a HuggingFace-hosted inference
 * endpoint (e.g. a scikit-learn Random Forest model served via HF Inference API
 * or a custom endpoint). Returns a structured risk level + friendly explanation.
 *
 * Model contract (HuggingFace tabular classification):
 *   Input  → { "inputs": { "systolic": 140, "diastolic": 90, ... } }
 *   Output → [ { "label": "HIGH_RISK", "score": 0.82 }, ... ]
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredictiveRiskService {

    private final RestTemplate restTemplate;

    @Value("${app.huggingface.api-key}")
    private String hfApiKey;

    @Value("${app.huggingface.endpoint}")
    private String hfEndpoint;

    public RiskPredictionResponse predict(RiskPredictionRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(hfApiKey);

        Map<String, Object> body = Map.of("inputs", request.getFeatures());

        Map<String, Double> rawScores = new LinkedHashMap<>();
        String riskLevel = "UNKNOWN";
        double riskScore = 0.0;

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    hfEndpoint,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());

                // HF classification output: array of [{label, score}]
                JsonNode results = root.isArray() ? root.get(0) : root;
                double highestScore = -1;

                if (results.isArray()) {
                    for (JsonNode item : results) {
                        String label = item.path("label").asText();
                        double score = item.path("score").asDouble();
                        rawScores.put(label, score);
                        if (score > highestScore) {
                            highestScore = score;
                            riskLevel = label;
                            riskScore = score;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("HuggingFace prediction failed: {}", e.getMessage());
            // Fall back to a rule-based estimate if HF is unavailable
            return fallbackRuleBased(request.getFeatures());
        }

        return RiskPredictionResponse.builder()
                .riskLevel(formatRiskLevel(riskLevel))
                .riskScore(riskScore)
                .explanation(buildExplanation(riskLevel, riskScore))
                .rawScores(rawScores)
                .predictedAt(LocalDateTime.now())
                .build();
    }

    /** Rule-based fallback so the app still works without a deployed model */
    private RiskPredictionResponse fallbackRuleBased(Map<String, Double> features) {
        double systolic = features.getOrDefault("systolic", 120.0);
        double bloodSugar = features.getOrDefault("blood_sugar", 100.0);

        String level;
        double score;
        if (systolic >= 160 || bloodSugar >= 250) {
            level = "HIGH_RISK"; score = 0.85;
        } else if (systolic >= 140 || bloodSugar >= 140) {
            level = "MODERATE_RISK"; score = 0.55;
        } else {
            level = "LOW_RISK"; score = 0.15;
        }

        return RiskPredictionResponse.builder()
                .riskLevel(level)
                .riskScore(score)
                .explanation(buildExplanation(level, score) + " (offline estimate)")
                .rawScores(Map.of(level, score))
                .predictedAt(LocalDateTime.now())
                .build();
    }

    private String formatRiskLevel(String label) {
        return label.toUpperCase().replace(" ", "_");
    }

    private String buildExplanation(String level, double score) {
        int pct = (int) Math.round(score * 100);
        return switch (level.toUpperCase()) {
            case "HIGH_RISK" -> String.format(
                    "Your readings suggest a high health risk (%d%% confidence). " +
                    "Please consult your doctor as soon as possible.", pct);
            case "MODERATE_RISK" -> String.format(
                    "Your readings show a moderate risk (%d%% confidence). " +
                    "Keep monitoring closely and follow your doctor's advice.", pct);
            default -> String.format(
                    "Your readings look healthy (%d%% confidence). Keep it up! " +
                    "Continue your current routine.", pct);
        };
    }
}
