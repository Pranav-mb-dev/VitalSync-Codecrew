package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.dto.MedicationRequest;
import com.healthcare.vitalsync.dto.MedicationResponse;
import com.healthcare.vitalsync.entities.Medication;
import com.healthcare.vitalsync.entities.MedicationLog;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.MedicationLogRepository;
import com.healthcare.vitalsync.repositories.MedicationRepository;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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
public class MedicationService {

    private final MedicationRepository medicationRepository;
    private final MedicationLogRepository medicationLogRepository;
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
    public MedicationResponse create(String email, MedicationRequest request) {
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

        Medication med = Medication.builder()
                .user(user)
                .name(request.getName())
                .dosage(request.getDosage())
                .frequency(request.getFrequency())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .instructions(request.getInstructions())
                .totalDays(totalDays)
                .daysLeft(daysLeft)
                .build();

        med = medicationRepository.save(med);
        return toResponse(med);
    }

    public List<MedicationResponse> getAll(String email) {
        User user = careContextService.resolveDataOwner(email);
        return medicationRepository.findByUser(user)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public List<MedicationResponse> scanPrescription(String email, MultipartFile file) {
        String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
        String base64Data;
        try {
            base64Data = Base64.getEncoder().encodeToString(file.getBytes());
        } catch (Exception e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }

        String urlPattern = geminiEndpoint + "/" + geminiModel + ":generateContent?key=%s";
        String prompt = "Extract all medications from this prescription. " +
            "For each medication, return the data adhering strictly to the following JSON structure: " +
            "[{ \"name\": \"Medicine Name\", \"dosage\": \"500mg\", \"frequency\": \"morning,afternoon,evening,night\" (comma separated valid sessions only based on prescription. Example: \"morning,night\"), \"instructions\": \"Before Food / After Food\", \"durationDays\": 5 (integer, number of days to take) }]. " +
            "Output ONLY valid JSON array and nothing else.";

        Map<String, Object> request = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt),
                    Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64Data))
                ))
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<MedicationResponse> savedMeds = new ArrayList<>();
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
                
                JsonNode medsArray = mapper.readTree(text);
                if (medsArray.isArray()) {
                    LocalDate today = LocalDate.now();
                    for (JsonNode medNode : medsArray) {
                        MedicationRequest medReq = new MedicationRequest();
                        medReq.setName(medNode.path("name").asText("Unknown Medicine"));
                        medReq.setDosage(medNode.path("dosage").asText(""));
                        medReq.setFrequency(medNode.path("frequency").asText("morning"));
                        medReq.setInstructions(medNode.path("instructions").asText(""));
                        
                        int duration = medNode.path("durationDays").asInt(7);
                        medReq.setStartDate(today);
                        medReq.setEndDate(today.plusDays(duration));
                        
                        savedMeds.add(this.create(email, medReq));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Gemini OCR failed: {}", e.getMessage());
            throw new RuntimeException("Failed to process prescription image. " + e.getMessage());
        }
        return savedMeds;
    }

    @Transactional
    public MedicationResponse update(String email, UUID medId, MedicationRequest request) {
        Medication med = getOwnedMedication(email, medId);
        if (request.getName() != null) med.setName(request.getName());
        if (request.getDosage() != null) med.setDosage(request.getDosage());
        if (request.getFrequency() != null) med.setFrequency(request.getFrequency());
        if (request.getStartDate() != null) med.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) med.setEndDate(request.getEndDate());
        if (request.getInstructions() != null) med.setInstructions(request.getInstructions());
        if (request.getTotalDays() != null) med.setTotalDays(request.getTotalDays());
        if (request.getDaysLeft() != null) med.setDaysLeft(request.getDaysLeft());
        else if (med.getEndDate() != null) {
            long between = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), med.getEndDate());
            med.setDaysLeft((int) Math.max(0, between));
        }

        med = medicationRepository.save(med);
        return toResponse(med);
    }

    @Transactional
    public void delete(String email, UUID medId) {
        Medication med = getOwnedMedication(email, medId);
        medicationRepository.delete(med);
    }

    @Transactional
    public void logIntake(String email, UUID medId, String session) {
        User requester = getUser(email);
        if (requester.getRole() == User.Role.CAREGIVER) {
            throw new SecurityException("Caregivers cannot log daily progress");
        }
        Medication med = getOwnedMedication(email, medId);
        MedicationLog log = MedicationLog.builder()
                .medication(med)
                .session(session)
                .takenAt(LocalDateTime.now())
                .build();
        medicationLogRepository.save(log);
    }

    private Medication getOwnedMedication(String email, UUID medId) {
        User user = careContextService.resolveDataOwner(email);
        Medication med = medicationRepository.findById(medId)
                .orElseThrow(() -> new IllegalArgumentException("Medication not found"));
        if (!med.getUser().getId().equals(user.getId())) {
            throw new SecurityException("Access denied");
        }
        return med;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }

    private MedicationResponse toResponse(Medication m) {
        List<MedicationLog> logs = medicationLogRepository.findByMedicationOrderByTakenAtDesc(m);
        LocalDate today = LocalDate.now();
        LocalDateTime lastTakenAt = logs.isEmpty() ? null : logs.get(0).getTakenAt();
        
        List<String> takenSessionsToday = logs.stream()
                .filter(log -> log.getTakenAt() != null && log.getTakenAt().toLocalDate().equals(today) && log.getSession() != null)
                .map(MedicationLog::getSession)
                .collect(Collectors.toList());

        int calcDaysLeft = m.getEndDate() != null ? 
            (int) Math.max(0, java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), m.getEndDate())) : 0;
            
        return MedicationResponse.builder()
                .id(m.getId())
                .name(m.getName())
                .dosage(m.getDosage())
                .frequency(m.getFrequency())
                .startDate(m.getStartDate())
                .endDate(m.getEndDate())
                .instructions(m.getInstructions())
                .totalDays(m.getTotalDays())
                .daysLeft(calcDaysLeft)
                .status(m.getStatus().name())
                .takenSessionsToday(takenSessionsToday)
                .lastTakenAt(lastTakenAt)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
