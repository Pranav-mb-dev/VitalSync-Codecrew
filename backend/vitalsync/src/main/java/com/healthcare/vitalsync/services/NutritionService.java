package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.FoodAnalysisResponse;
import com.healthcare.vitalsync.entities.HealthReport;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.HealthReportRepository;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * NutritionService
 * ─────────────────
 * Uses the SECONDARY Gemini API key to analyze a food photo.
 * Returns nutritional estimates and alerts based on the patient's medical profile.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NutritionService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final HealthReportRepository healthReportRepository;
    private final CareContextService careContextService;
    private final UserPreferenceService userPreferenceService;

    @Value("${app.gemini.api-key-secondary}")
    private String geminiSecondaryKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    public FoodAnalysisResponse analyzeFood(String email, MultipartFile photo) {
        User user = careContextService.resolveDataOwner(email);
        // Fetch the patient's medical conditions to personalise the alert
        String medicalContext = "";
        try {
            var profile = profileRepository.findByUser(user).orElse(null);
            if (profile != null && profile.getMedicalConditions() != null) {
                medicalContext = profile.getMedicalConditions();
            }
        } catch (Exception ignored) {}

        String base64;
        String mimeType;
        try {
            base64 = Base64.getEncoder().encodeToString(photo.getBytes());
            mimeType = photo.getContentType() != null ? photo.getContentType() : "image/jpeg";
        } catch (Exception e) {
            throw new RuntimeException("Could not read photo bytes", e);
        }

        String prompt = String.format("""
                You are a nutritionist AI. Analyze the food in this photo.
                Patient's medical conditions: %s
                
                Return a JSON object with these fields:
                - "detectedFood": name of the food item(s)
                - "estimatedCalories": rough calorie count (string)
                - "protein": protein estimate (e.g. "12g")
                - "carbohydrates": carb estimate (e.g. "45g")
                - "fats": fat estimate (e.g. "8g")
                - "medicalAlert": any concern given the patient's conditions (empty string if none)
                - "summary": 2-3 friendly sentences about this meal
                %s
                """,
                medicalContext.isEmpty() ? "none provided" : medicalContext,
                userPreferenceService.structuredJsonInstruction(user)
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", prompt),
                        Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64))
                )))
        );

        String url = geminiEndpoint + "/" + geminiModel + ":generateContent?key=" + geminiSecondaryKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(requestBody, headers), String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String raw = extractGeminiText(response.getBody());
                raw = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(raw);
                return FoodAnalysisResponse.builder()
                        .detectedFood(node.path("detectedFood").asText())
                        .estimatedCalories(node.path("estimatedCalories").asText())
                        .protein(node.path("protein").asText())
                        .carbohydrates(node.path("carbohydrates").asText())
                        .fats(node.path("fats").asText())
                        .medicalAlert(node.path("medicalAlert").asText())
                        .summary(node.path("summary").asText())
                        .build();
            }
        } catch (Exception e) {
            log.warn("Gemini food analysis failed: {}", e.getMessage());
        }

        return FoodAnalysisResponse.builder()
                .detectedFood("Unknown")
                .summary("Could not analyze the food photo at this time.")
                .build();
    }

    public List<Map<String, Object>> generateDietPlan(String email) {
        User user = careContextService.resolveDataOwner(email);
        String medicalContext = "";
        try {
            var profile = profileRepository.findByUser(user).orElse(null);
            if (profile != null && profile.getMedicalConditions() != null) {
                medicalContext = profile.getMedicalConditions();
            }
        } catch (Exception ignored) {}

        String prompt = String.format("""
                You are a nutritionist AI. Generate a 1-day diet plan (Breakfast, Lunch, Dinner, Snack) for a patient.
                Patient's medical conditions: %s
                
                Return ONLY a JSON array of objects representing these 4 meals:
                [
                  { "type": "Breakfast", "food": "Oatmeal with berries", "calories": 350, "macros": "P: 10g | C: 60g | F: 5g", "alert": "" }
                ]
                Keep the meal `type` values exactly as Breakfast, Lunch, Dinner, Snack.
                %s
                """,
                medicalContext.isEmpty() ? "None" : medicalContext,
                userPreferenceService.structuredJsonInstruction(user)
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        String url = geminiEndpoint + "/" + geminiModel + ":generateContent?key=" + geminiSecondaryKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, new HttpEntity<>(requestBody, headers), String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String raw = extractGeminiText(response.getBody());
                raw = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                ObjectMapper mapper = new ObjectMapper();
                return mapper.readValue(raw, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to generate diet plan", e);
        }
        return List.of();
    }

    public List<Map<String, Object>> generateDietPlanFromReport(String email, UUID reportId, String medicalConditionsOverride) {
        if (reportId == null) return generateDietPlan(email);

        String medicalContext = "";
        User user = careContextService.resolveDataOwner(email);
        try {
            if (medicalConditionsOverride != null && !medicalConditionsOverride.isBlank()) {
                medicalContext = medicalConditionsOverride.trim();
            } else {
                var profile = profileRepository.findByUser(user).orElse(null);
                if (profile != null && profile.getMedicalConditions() != null) {
                    medicalContext = profile.getMedicalConditions();
                }
            }
        } catch (Exception ignored) {}

        HealthReport report = healthReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

        // Ensure the report belongs to the authenticated user
        if (report.getUser() == null || report.getUser().getId() == null || !report.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Not authorized for this report");
        }

        String metrics = report.getExtractedMetrics() != null ? report.getExtractedMetrics() : "";
        String summary = report.getGeminiSummary() != null ? report.getGeminiSummary() : "";
        String rawText = report.getRawExtractedText() != null ? report.getRawExtractedText() : "";
        if (rawText.length() > 2500) rawText = rawText.substring(0, 2500);

        String prompt = String.format("""
                You are a nutritionist AI. Generate a 1-day diet plan (Breakfast, Lunch, Dinner, Snack) for a patient.
                Patient's medical conditions/diseases: %s

                Recent health report context:
                - extractedMetrics (JSON): %s
                - AI summary: %s
                - rawExtractedText (truncated): %s

                Produce a plan that avoids contraindicated foods and is conservative if any values look critical.
                Return ONLY a JSON array of objects representing these 4 meals:
                [
                  { "type": "Breakfast", "food": "Oatmeal with berries", "calories": 350, "macros": "P: 10g | C: 60g | F: 5g", "alert": "" }
                ]
                Keep the meal `type` values exactly as Breakfast, Lunch, Dinner, Snack.
                %s
                """,
                medicalContext.isEmpty() ? "None" : medicalContext,
                metrics.isEmpty() ? "{}" : metrics,
                summary.isEmpty() ? "N/A" : summary,
                rawText.isEmpty() ? "N/A" : rawText,
                userPreferenceService.structuredJsonInstruction(user)
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );
        String url = geminiEndpoint + "/" + geminiModel + ":generateContent?key=" + geminiSecondaryKey;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, new HttpEntity<>(requestBody, headers), String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String raw = extractGeminiText(response.getBody());
                raw = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                ObjectMapper mapper = new ObjectMapper();
                return mapper.readValue(raw, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("Failed to generate diet plan from report", e);
        }
        return List.of();
    }

    private String extractGeminiText(String body) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readTree(body)
                    .path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();
        } catch (Exception e) {
            return "{}";
        }
    }
}
