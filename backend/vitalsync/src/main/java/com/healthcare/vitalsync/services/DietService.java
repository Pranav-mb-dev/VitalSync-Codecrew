package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.DietRequest;
import com.healthcare.vitalsync.dto.DietResponse;
import com.healthcare.vitalsync.entities.Diet;
import com.healthcare.vitalsync.entities.DietLog;
import com.healthcare.vitalsync.entities.HealthReport;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.DietLogRepository;
import com.healthcare.vitalsync.repositories.DietRepository;
import com.healthcare.vitalsync.repositories.HealthReportRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DietService {

    private final DietRepository dietRepository;
    private final DietLogRepository dietLogRepository;
    private final HealthReportRepository healthReportRepository;
    private final UserRepository userRepository;
    private final CareContextService careContextService;
    private final RestTemplate restTemplate;

    @Value("${app.gemini.api-key-primary}")
    private String geminiPrimaryKey;

    @Value("${app.gemini.api-key-secondary}")
    private String geminiSecondaryKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    @Transactional
    public DietResponse create(String email, DietRequest request) {
        User user = careContextService.resolveDataOwner(email);

        Integer daysLeft = request.getDaysLeft();
        if (daysLeft == null && request.getEndDate() != null) {
            long between = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), request.getEndDate());
            daysLeft = (int) Math.max(0, between);
        }
        Integer totalDays = request.getTotalDays();
        if (totalDays == null && request.getStartDate() != null && request.getEndDate() != null) {
            long between = java.time.temporal.ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate());
            totalDays = (int) Math.max(1, between);
        }

        Diet diet = Diet.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .frequency(request.getFrequency())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .totalDays(totalDays)
                .daysLeft(daysLeft)
                .status(Diet.Status.ACTIVE)
                .build();

        diet = dietRepository.save(diet);
        return toResponse(diet);
    }

    public List<DietResponse> getAll(String email) {
        User user = careContextService.resolveDataOwner(email);
        return dietRepository.findByUser(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public DietResponse update(String email, UUID dietId, DietRequest request) {
        Diet diet = getOwnedDiet(email, dietId);
        if (request.getName() != null) diet.setName(request.getName());
        if (request.getDescription() != null) diet.setDescription(request.getDescription());
        if (request.getFrequency() != null) diet.setFrequency(request.getFrequency());
        if (request.getStartDate() != null) diet.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) diet.setEndDate(request.getEndDate());
        if (request.getTotalDays() != null) diet.setTotalDays(request.getTotalDays());
        if (request.getDaysLeft() != null) diet.setDaysLeft(request.getDaysLeft());
        else if (diet.getEndDate() != null) {
            long between = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), diet.getEndDate());
            diet.setDaysLeft((int) Math.max(0, between));
        }

        diet = dietRepository.save(diet);
        return toResponse(diet);
    }

    @Transactional
    public void delete(String email, UUID dietId) {
        Diet diet = getOwnedDiet(email, dietId);
        dietRepository.delete(diet);
    }

    @Transactional
    public void logIntake(String email, UUID dietId, String session) {
        User requester = getUser(email);
        if (requester.getRole() == User.Role.CAREGIVER) {
            throw new SecurityException("Caregivers cannot log daily progress");
        }
        Diet diet = getOwnedDiet(email, dietId);
        DietLog log = DietLog.builder()
                .diet(diet)
                .session(session)
                .takenAt(LocalDateTime.now())
                .build();
        dietLogRepository.save(log);
    }

    @Transactional
    public List<DietResponse> scanDietChart(String email, MultipartFile file) {
        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        String base64Data;
        try {
            base64Data = Base64.getEncoder().encodeToString(file.getBytes());
        } catch (Exception e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }

        String prompt = "Extract all diet/meal recommendations from this chart. " +
            "For each item, return the data adhering strictly to the following JSON structure: " +
            "[{ \"name\": \"Meal Plan Name\", \"description\": \"Detailed Description of food\", \"frequency\": \"morning,afternoon,evening,night\" (comma separated based on timing), \"durationDays\": 30 (integer) }]. " +
            "Output ONLY valid JSON array and nothing else.";

        return processGeminiRequest(email, prompt, mimeType, base64Data);
    }

    @Transactional
    public List<DietResponse> generateDietPlan(String email) {
        User user = careContextService.resolveDataOwner(email);
        List<HealthReport> reports = healthReportRepository.findTop3ByUserOrderByUploadedAtDesc(user);
        
        String reportContext = "No prior health reports available. Please suggest a generic balanced healthy diet.";
        if (reports != null && !reports.isEmpty()) {
            HealthReport latest = reports.get(0);
            reportContext = "Based on the recent health report with summary: " + latest.getGeminiSummary() +
                            " and metrics: " + latest.getExtractedMetrics();
        }

        String prompt = "You are an expert nutritionist. " + reportContext + 
            " Create a personalized weekly meal plan with 4-5 items taking standard timings (morning, afternoon, evening, night). " +
            "Return the data adhering strictly to the following JSON structure: " +
            "[{ \"name\": \"Short Meal Title (e.g. Oatmeal)\", \"description\": \"Detailed description (e.g. 1 bowl with berries)\", \"frequency\": \"morning,afternoon,evening,night\" (comma separated indicating the session), \"durationDays\": 30 (integer) }]. " +
            "Output ONLY valid JSON array and nothing else.";

        return processGeminiRequest(email, prompt, null, null);
    }

    private List<DietResponse> processGeminiRequest(String email, String prompt, String mimeType, String base64Data) {
        String urlPattern = geminiEndpoint + "/" + geminiModel + ":generateContent?key=%s";

        List<Object> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));
        
        if (mimeType != null && base64Data != null) {
            parts.add(Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64Data)));
        }

        Map<String, Object> request = Map.of("contents", List.of(Map.of("parts", parts)));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<DietResponse> savedDiets = new ArrayList<>();
        try {
            ResponseEntity<String> response;
            try {
                response = restTemplate.postForEntity(String.format(urlPattern, geminiPrimaryKey), new HttpEntity<>(request, headers), String.class);
            } catch (Exception e) {
                log.warn("Primary Gemini key failed, trying secondary...");
                response = restTemplate.postForEntity(String.format(urlPattern, geminiSecondaryKey), new HttpEntity<>(request, headers), String.class);
            }

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.getBody());
                String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                text = text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                
                JsonNode itemsArray = mapper.readTree(text);
                if (itemsArray.isArray()) {
                    LocalDate today = LocalDate.now();
                    for (JsonNode itemNode : itemsArray) {
                        DietRequest dietReq = new DietRequest();
                        dietReq.setName(itemNode.path("name").asText("Meal"));
                        dietReq.setDescription(itemNode.path("description").asText(""));
                        dietReq.setFrequency(itemNode.path("frequency").asText("morning"));
                        
                        int duration = itemNode.path("durationDays").asInt(30);
                        dietReq.setStartDate(today);
                        dietReq.setEndDate(today.plusDays(duration));
                        
                        savedDiets.add(this.create(email, dietReq));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Gemini Diet generation failed: {}", e.getMessage());
            throw new RuntimeException("Failed to generate diet plan. " + e.getMessage());
        }
        return savedDiets;
    }

    private Diet getOwnedDiet(String email, UUID dietId) {
        User user = careContextService.resolveDataOwner(email);
        Diet diet = dietRepository.findById(dietId)
                .orElseThrow(() -> new IllegalArgumentException("Diet not found"));
        if (!diet.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied");
        }
        return diet;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private DietResponse toResponse(Diet d) {
        List<DietLog> logs = dietLogRepository.findByDietOrderByTakenAtDesc(d);
        LocalDate today = LocalDate.now();
        LocalDateTime lastTakenAt = logs.isEmpty() ? null : logs.get(0).getTakenAt();
        
        List<String> takenSessionsToday = logs.stream()
                .filter(log -> log.getTakenAt() != null && log.getTakenAt().toLocalDate().equals(today) && log.getSession() != null)
                .map(DietLog::getSession)
                .collect(Collectors.toList());

        int calcDaysLeft = d.getEndDate() != null ? 
            (int) Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), d.getEndDate())) : 0;
            
        return DietResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .description(d.getDescription())
                .frequency(d.getFrequency())
                .startDate(d.getStartDate())
                .endDate(d.getEndDate())
                .totalDays(d.getTotalDays())
                .daysLeft(calcDaysLeft)
                .status(d.getStatus().name())
                .takenSessionsToday(takenSessionsToday)
                .lastTakenAt(lastTakenAt)
                .createdAt(d.getCreatedAt())
                .build();
    }
}
