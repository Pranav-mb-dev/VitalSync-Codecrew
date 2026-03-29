package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.VitalReadingRequest;
import com.healthcare.vitalsync.dto.VitalReadingResponse;
import com.healthcare.vitalsync.entities.SosAlert;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.entities.VitalReading;
import com.healthcare.vitalsync.repositories.UserRepository;
import com.healthcare.vitalsync.repositories.VitalReadingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class VitalReadingService {

    private final VitalReadingRepository vitalReadingRepository;
    private final UserRepository userRepository;
    private final SosAlertService sosAlertService;
    private final RestTemplate restTemplate;
    private final CareContextService careContextService;

    @Value("${app.gemini.api-key-primary}")
    private String geminiPrimaryKey;

    @Value("${app.gemini.api-key-secondary}")
    private String geminiSecondaryKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    @Value("${app.sos.bp-systolic-high:180}")
    private double bpSystolicHigh;

    @Value("${app.sos.bp-diastolic-high:120}")
    private double bpDiastolicHigh;

    @Value("${app.sos.blood-sugar-high:300}")
    private double bloodSugarHigh;

    @Value("${app.sos.blood-sugar-low:50}")
    private double bloodSugarLow;

    @Value("${APP_VITALS_MOCK_ENABLED:${app.vitals.mock-enabled:false}}")
    private boolean vitalsMockEnabled;

    @Value("${APP_VITALS_MOCK_POINTS:${app.vitals.mock-points:12}}")
    private int vitalsMockPoints;

    @Transactional
    public VitalReadingResponse recordVital(String email, VitalReadingRequest request) {
        User user = careContextService.resolveDataOwner(email);

        VitalReading.VitalType type;
        try {
            type = VitalReading.VitalType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown vital type: " + request.getType());
        }

        LocalDateTime measuredAt = request.getMeasuredAt() != null
                ? request.getMeasuredAt()
                : LocalDateTime.now();

        boolean isCritical = isCriticalReading(type, request.getValue(), request.getSecondaryValue());

        VitalReading reading = VitalReading.builder()
                .user(user)
                .type(type)
                .value(request.getValue())
                .secondaryValue(request.getSecondaryValue())
                .unit(request.getUnit())
                .measuredAt(measuredAt)
                .notes(request.getNotes())
                .criticalFlag(isCritical)
                .build();
        vitalReadingRepository.save(reading);

        if (isCritical) {
            String reason = buildCriticalReason(type, request.getValue(), request.getSecondaryValue());
            sosAlertService.triggerAutomaticSos(user, reason,
                    SosAlert.TriggerType.VITAL_THRESHOLD, null, null);
        }

        return toResponse(reading);
    }

    @Transactional
    public VitalReadingResponse updateVital(String email, UUID id, VitalReadingRequest request) {
        User user = careContextService.resolveDataOwner(email);
        VitalReading reading = vitalReadingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vital reading not found"));

        if (!reading.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized");
        }

        VitalReading.VitalType type;
        try {
            type = VitalReading.VitalType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown vital type: " + request.getType());
        }

        reading.setType(type);
        reading.setValue(request.getValue());
        reading.setSecondaryValue(request.getSecondaryValue());
        reading.setUnit(request.getUnit());
        reading.setMeasuredAt(request.getMeasuredAt() != null ? request.getMeasuredAt() : reading.getMeasuredAt());
        reading.setNotes(request.getNotes());

        boolean isCritical = isCriticalReading(type, request.getValue(), request.getSecondaryValue());
        reading.setCriticalFlag(isCritical);

        vitalReadingRepository.save(reading);
        return toResponse(reading);
    }

    @Transactional
    public void deleteVital(String email, UUID id) {
        User user = careContextService.resolveDataOwner(email);
        VitalReading reading = vitalReadingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Vital reading not found"));
        if (!reading.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized");
        }
        vitalReadingRepository.delete(reading);
    }

    public List<VitalReadingResponse> getVitals(String email, String type) {
        User user = careContextService.resolveDataOwner(email);
        // When mock mode is enabled, always return generated data (do not read/write DB here).
        if (vitalsMockEnabled) {
            VitalReading.VitalType vType = null;
            if (type != null && !type.isBlank()) {
                vType = VitalReading.VitalType.valueOf(type.toUpperCase());
            }
            return buildMockVitals(user, vType);
        }
        if (type != null && !type.isBlank()) {
            VitalReading.VitalType vType = VitalReading.VitalType.valueOf(type.toUpperCase());
            List<VitalReadingResponse> res = vitalReadingRepository.findByUserAndTypeOrderByMeasuredAtDesc(user, vType)
                    .stream().map(this::toResponse).collect(Collectors.toList());
            return res;
        }
        List<VitalReadingResponse> res = vitalReadingRepository.findByUserOrderByMeasuredAtDesc(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
        return res;
    }

    private List<VitalReadingResponse> buildMockVitals(User user, VitalReading.VitalType onlyType) {
        int points = Math.max(6, Math.min(48, vitalsMockPoints));

        long seed = user.getId() != null ? user.getId().getMostSignificantBits() ^ user.getId().getLeastSignificantBits() : 42L;
        Random rnd = new Random(seed);
        LocalDateTime endAt = LocalDateTime.now().withSecond(0).withNano(0);

        List<VitalReading.VitalType> types = new ArrayList<>();
        if (onlyType != null) {
            types.add(onlyType);
        } else {
            types.addAll(List.of(VitalReading.VitalType.values()));
        }

        List<VitalReadingResponse> out = new ArrayList<>(types.size() * points);
        for (VitalReading.VitalType type : types) {
            String unit = switch (type) {
                case BLOOD_PRESSURE -> "mmHg";
                case BLOOD_SUGAR -> "mg/dL";
                case HEART_RATE -> "bpm";
                case OXYGEN_SATURATION -> "%";
                case WEIGHT -> "kg";
                case TEMPERATURE -> "°C";
            };

            for (int i = 0; i < points; i++) {
                // Spread points across the last ~24 hours.
                int hoursBack = (points - 1 - i) * 2;
                LocalDateTime measuredAt = endAt.minusHours(hoursBack);

                Double primary;
                Double secondary = null;
                switch (type) {
                    case BLOOD_SUGAR -> primary = clamp(85 + rnd.nextGaussian() * 18, 55, 240);
                    case OXYGEN_SATURATION -> primary = clamp(97 + rnd.nextGaussian() * 1.2, 90, 100);
                    case HEART_RATE -> primary = clamp(78 + rnd.nextGaussian() * 10, 50, 130);
                    case WEIGHT -> primary = round1(clamp(70 + rnd.nextGaussian() * 2.2, 45, 120));
                    case TEMPERATURE -> primary = round1(clamp(36.8 + rnd.nextGaussian() * 0.25, 35.5, 39.5));
                    case BLOOD_PRESSURE -> {
                        primary = clamp(122 + rnd.nextGaussian() * 10, 90, 190); // systolic
                        secondary = clamp(80 + rnd.nextGaussian() * 7, 55, 130); // diastolic
                    }
                    default -> primary = 0.0;
                }

                boolean critical = isCriticalReading(type, primary, secondary);

                out.add(VitalReadingResponse.builder()
                        .id(UUID.randomUUID())
                        .type(type.name())
                        .value(round1(primary))
                        .secondaryValue(secondary != null ? round1(secondary) : null)
                        .unit(unit)
                        .measuredAt(measuredAt)
                        .notes("Mock data")
                        .criticalFlag(critical)
                        .createdAt(measuredAt)
                        .build());
            }
        }

        out.sort(Comparator.comparing(VitalReadingResponse::getMeasuredAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return out;
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private boolean isCriticalReading(VitalReading.VitalType type, Double value, Double secondary) {
        return switch (type) {
            case BLOOD_PRESSURE -> value >= bpSystolicHigh || (secondary != null && secondary >= bpDiastolicHigh);
            case BLOOD_SUGAR -> value >= bloodSugarHigh || value <= bloodSugarLow;
            default -> false;
        };
    }

    private String buildCriticalReason(VitalReading.VitalType type, Double value, Double secondary) {
        return switch (type) {
            case BLOOD_PRESSURE -> String.format("Critical BP: %.0f/%.0f mmHg", value, secondary != null ? secondary : 0);
            case BLOOD_SUGAR -> String.format("Critical Blood Sugar: %.1f mg/dL", value);
            default -> "Critical vital reading detected";
        };
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private VitalReadingResponse toResponse(VitalReading v) {
        return VitalReadingResponse.builder()
                .id(v.getId())
                .type(v.getType().name())
                .value(v.getValue())
                .secondaryValue(v.getSecondaryValue())
                .unit(v.getUnit())
                .measuredAt(v.getMeasuredAt())
                .notes(v.getNotes())
                .criticalFlag(v.isCriticalFlag())
                .createdAt(v.getCreatedAt())
                .build();
    }

    public VitalReadingRequest extractVitalsFromPhoto(String email, MultipartFile photo) {
        String base64;
        String mimeType;
        try {
            base64 = Base64.getEncoder().encodeToString(photo.getBytes());
            mimeType = photo.getContentType() != null ? photo.getContentType() : "image/jpeg";
        } catch (Exception e) {
            throw new RuntimeException("Could not read photo bytes", e);
        }

        String prompt = """
                You are a medical OCR assistant. Analyze this image of a medical device display (like a blood pressure monitor, glucometer, or scale).
                Determine the type of reading and its values.
                
                Return ONLY a JSON object with these fields (no markdown, no backticks):
                - "type": "BLOOD_PRESSURE" | "BLOOD_SUGAR" | "HEART_RATE" | "WEIGHT"
                - "value": numeric primary value (e.g. systolic, sugar, weight)
                - "secondaryValue": numeric secondary value (e.g. diastolic), or null
                - "unit": "mmHg" or "mg/dL" or "bpm" or "kg"
                """;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", prompt),
                        Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64))
                )))
        );

        String urlPattern = geminiEndpoint + "/" + geminiModel + ":generateContent?key=%s";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response;
            try {
                response = restTemplate.postForEntity(String.format(urlPattern, geminiPrimaryKey), new HttpEntity<>(requestBody, headers), String.class);
            } catch (Exception e) {
                log.warn("Primary Gemini key failed for vital reading, falling back to secondary...");
                response = restTemplate.postForEntity(String.format(urlPattern, geminiSecondaryKey), new HttpEntity<>(requestBody, headers), String.class);
            }

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String raw = extractGeminiText(response.getBody());
                raw = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(raw);
                
                VitalReadingRequest req = new VitalReadingRequest();
                req.setType(node.path("type").asText("BLOOD_PRESSURE"));
                req.setValue(node.path("value").asDouble(0.0));
                
                if (node.has("secondaryValue") && !node.path("secondaryValue").isNull()) {
                    req.setSecondaryValue(node.path("secondaryValue").asDouble());
                }
                
                req.setUnit(node.path("unit").asText("mmHg"));
                req.setNotes("Extracted via AI Scan");
                return req;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gemini reading extraction failed", e);
        }

        throw new RuntimeException("Unable to analyze device photo");
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
