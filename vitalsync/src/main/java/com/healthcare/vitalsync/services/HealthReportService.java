package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.HealthReportResponse;
import com.healthcare.vitalsync.entities.HealthReport;
import com.healthcare.vitalsync.entities.SosAlert;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.HealthReportRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import com.healthcare.vitalsync.security.SupabaseStorageClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Iterator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthReportService {

    private final HealthReportRepository healthReportRepository;
    private final UserRepository userRepository;
    private final SosAlertService sosAlertService;
    private final RestTemplate restTemplate;
    private final SupabaseStorageClient supabaseStorageClient;
    private final CareContextService careContextService;
    private final UserPreferenceService userPreferenceService;

    @Value("${app.gemini.api-key-primary}")
    private String geminiApiKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    @Value("${app.huggingface.api-key}")
    private String hfApiKey;

    @Value("${app.huggingface.endpoint}")
    private String hfEndpoint;

    @Transactional
    public HealthReportResponse uploadAndAnalyze(String email, MultipartFile file) {
        User user = careContextService.resolveDataOwner(email);

        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        String base64Data;
        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
            base64Data = Base64.getEncoder().encodeToString(fileBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }

        // Upload the file natively to Supabase Storage!
        String fileUrl = supabaseStorageClient.uploadFile(fileBytes, file.getOriginalFilename(), mimeType);

        String geminiUrl = geminiEndpoint + "/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        // ==========================================
        //  STEP 1: Gemini OCR Extraction
        // ==========================================
        String ocrPrompt = "Extract all text from this medical report. Return ONLY the raw extracted text without any markdown or conversational text.";
        Map<String, Object> ocrRequest = buildGeminiVisionRequest(ocrPrompt, base64Data, mimeType);
        
        String rawText = "No text extracted.";
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    geminiUrl, new HttpEntity<>(ocrRequest, createJsonHeaders()), String.class
            );
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                rawText = parseGeminiText(response.getBody());
            }
        } catch (Exception e) {
            log.warn("Gemini OCR failed: {}", e.getMessage());
        }

        // ==========================================
        //  STEP 2: HuggingFace ML Analysis
        // ==========================================
        String hfAnalysis = "Analysis unavailable.";
        if (!"No text extracted.".equals(rawText)) {
            String hfPrompt = "[INST] Analyze this medical report text and identify any potential health risks or abnormal conditions. Focus on medical facts only:\n" + rawText + "\n[/INST]";
            try {
                HttpHeaders hfHeaders = new HttpHeaders();
                hfHeaders.setContentType(MediaType.APPLICATION_JSON);
                hfHeaders.setBearerAuth(hfApiKey);

                Map<String, Object> hfBody = Map.of(
                        "inputs", hfPrompt,
                        "parameters", Map.of("max_new_tokens", 500, "return_full_text", false)
                );

                ResponseEntity<List> hfResponse = restTemplate.postForEntity(
                        hfEndpoint, new HttpEntity<>(hfBody, hfHeaders), List.class
                );

                if (hfResponse.getStatusCode() == HttpStatus.OK && hfResponse.getBody() != null && !hfResponse.getBody().isEmpty()) {
                    Map<String, Object> firstResult = (Map<String, Object>) hfResponse.getBody().get(0);
                    hfAnalysis = (String) firstResult.get("generated_text");
                    if (hfAnalysis != null) hfAnalysis = hfAnalysis.trim();
                }
            } catch (Exception e) {
                log.warn("HF Analysis failed: {}", e.getMessage());
            }
        }

        // ==========================================
        //  STEP 3: Gemini Synthesis & Formatting
        // ==========================================
        String finalPrompt = "You are a medical AI assistant. Combine the raw medical report text and the AI analysis below to output a final JSON response.\n\n" +
                "Raw Report:\n" + rawText + "\n\n" +
                "AI Analysis:\n" + hfAnalysis + "\n\n" +
                "Provide a friendly, easy-to-understand summary for an elderly patient (no jargon).\n" +
                "Return valid JSON with three fields strictly:\n" +
                " - \"summary\": friendly explanation in 3-5 sentences\n" +
                " - \"metrics\": key-value pairs of extracted numerical values (e.g. {\"Hemoglobin\":\"12.5\"})\n" +
                " - \"critical\": boolean - true if any value is dangerously abnormal\n" +
                userPreferenceService.localizedReportMetricsInstruction(user) + "\n";

        Map<String, Object> synthesisRequest = buildGeminiTextRequest(finalPrompt);
        
        String summary = "Report uploaded. AI summary unavailable.";
        String metrics = "{}";
        boolean critical = false;

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    geminiUrl, new HttpEntity<>(synthesisRequest, createJsonHeaders()), String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                String parsed = parseGeminiText(response.getBody());
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(parsed);
                summary = node.path("summary").asText(summary);
                metrics = normalizeMetricsJson(node.path("metrics")).toString();
                critical = node.path("critical").asBoolean(false);
            }
        } catch (Exception e) {
            log.warn("Gemini Synthesis failed: {}", e.getMessage());
        }

        // ==========================================
        //  STEP 4: Database Persistence
        // ==========================================
        HealthReport report = HealthReport.builder()
                .user(user)
                .fileUrl(fileUrl)
                .fileType(mimeType)
                .rawExtractedText(rawText)
                .hfAnalysis(hfAnalysis)
                .geminiSummary(summary)
                .extractedMetrics(metrics)
                .criticalFlagged(critical)
                .build();
        healthReportRepository.save(report);

        if (critical) {
            sosAlertService.triggerAutomaticSos(user,
                    "Medical report flagged critical values",
                    SosAlert.TriggerType.REPORT_FLAGGED,
                    null, null);
        }

        return toResponse(report);
    }

    public List<HealthReportResponse> getReports(String email) {
        User user = careContextService.resolveDataOwner(email);
        return healthReportRepository.findByUserOrderByUploadedAtDesc(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private Map<String, Object> buildGeminiVisionRequest(String prompt, String base64Data, String mimeType) {
        return Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt),
                                Map.of("inlineData", Map.of(
                                        "mimeType", mimeType,
                                        "data", base64Data
                                ))
                        ))
                )
        );
    }

    private Map<String, Object> buildGeminiTextRequest(String prompt) {
        return Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );
    }

    private HttpHeaders createJsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private String parseGeminiText(String responseBody) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(responseBody);
            String text = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();
            // Clean up any markdown code blocks
            text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            return text;
        } catch (Exception e) {
            log.warn("Failed to parse Gemini JSON response: {}", e.getMessage());
            return "{\"summary\":\"Could not parse AI response.\",\"metrics\":{},\"critical\":false}";
        }
    }

    private JsonNode normalizeMetricsJson(JsonNode metricsNode) {
        ObjectMapper mapper = new ObjectMapper();
        if (metricsNode == null || metricsNode.isMissingNode() || metricsNode.isNull()) {
            return mapper.createObjectNode();
        }

        if (metricsNode.isObject()) {
            var normalized = mapper.createObjectNode();
            Iterator<Map.Entry<String, JsonNode>> fields = metricsNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                normalized.set(field.getKey(), normalizeMetricsJson(field.getValue()));
            }
            return normalized;
        }

        if (metricsNode.isArray()) {
            var normalized = mapper.createArrayNode();
            for (JsonNode item : metricsNode) {
                normalized.add(normalizeMetricsJson(item));
            }
            return normalized;
        }

        if (metricsNode.isTextual()) {
            return mapper.getNodeFactory().textNode(normalizeNumericText(metricsNode.asText()));
        }

        return metricsNode;
    }

    private String normalizeNumericText(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }

        StringBuilder out = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (Character.isDigit(current)) {
                out.append(Character.getNumericValue(current));
            } else if (current == '٫' || current == '·') {
                out.append('.');
            } else if (current == '−' || current == '–' || current == '—') {
                out.append('-');
            } else {
                out.append(current);
            }
        }
        return out.toString();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private HealthReportResponse toResponse(HealthReport r) {
        return HealthReportResponse.builder()
                .id(r.getId())
                .fileUrl(r.getFileUrl())
                .fileType(r.getFileType())
                .rawExtractedText(r.getRawExtractedText())
                .hfAnalysis(r.getHfAnalysis())
                .geminiSummary(r.getGeminiSummary())
                .extractedMetrics(r.getExtractedMetrics())
                .criticalFlagged(r.isCriticalFlagged())
                .uploadedAt(r.getUploadedAt())
                .build();
    }
}
