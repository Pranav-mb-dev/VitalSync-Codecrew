package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.VoiceAssistantResponse;
import com.healthcare.vitalsync.entities.*;
import com.healthcare.vitalsync.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VoiceAssistantService {

    private final CareContextService careContextService;
    private final ProfileRepository profileRepository;
    private final VitalReadingRepository vitalReadingRepository;
    private final MedicationRepository medicationRepository;
    private final AppointmentRepository appointmentRepository;
    private final HabitRepository habitRepository;
    private final HealthReportRepository healthReportRepository;
    private final UserPreferenceService userPreferenceService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Value("${app.gemini.api-key-primary}")
    private String geminiApiKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    public VoiceAssistantResponse answer(String requesterEmail, String transcript) {
        User dataOwner = careContextService.resolveDataOwner(requesterEmail);

        Map<String, Object> context = buildContextSnapshot(dataOwner);
        String contextJson;
        try {
            contextJson = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            throw new RuntimeException("Could not serialize assistant context: " + e.getMessage(), e);
        }

        String prompt = """
                You are VitalSync, a healthcare assistant inside a personal health app.
                The user query comes from a voice transcript.
                
                Rules:
                - Use ONLY the provided patient data JSON to answer. Do not invent values.
                - If the user asks for data not present, say you don't have it in the app yet and suggest where they can add it (vitals, meds, appointments, reports, profile).
                - Keep answers short, clear, and directly actionable.
                - If the user requests medical diagnosis or unsafe advice, respond with general, safe guidance and recommend consulting a clinician.
                - %s
                
                Current server time: %s
                
                Patient data (JSON):
                %s
                
                User question (transcript):
                %s
                """.formatted(
                userPreferenceService.plainTextInstruction(dataOwner),
                LocalDateTime.now(),
                contextJson,
                transcript
        );

        String answer = callGeminiText(prompt);
        return VoiceAssistantResponse.builder().answer(answer).build();
    }

    private Map<String, Object> buildContextSnapshot(User user) {
        Map<String, Object> context = new LinkedHashMap<>();

        Map<String, Object> userBlock = new LinkedHashMap<>();
        userBlock.put("userId", user.getId() != null ? user.getId().toString() : null);
        userBlock.put("email", user.getEmail());
        userBlock.put("role", user.getRole().name());
        context.put("user", userBlock);

        profileRepository.findByUser(user).ifPresent(profile -> {
            Map<String, Object> profileBlock = new LinkedHashMap<>();
            profileBlock.put("fullName", profile.getFullName());
            profileBlock.put("dateOfBirth", profile.getDateOfBirth() != null ? profile.getDateOfBirth().toString() : null);
            profileBlock.put("bloodType", profile.getBloodType());
            profileBlock.put("allergies", profile.getAllergies());
            profileBlock.put("medicalConditions", profile.getMedicalConditions());
            profileBlock.put("language", user.getLanguage());
            profileBlock.put("phoneNumber", profile.getPhoneNumber());
            profileBlock.put("emergencyContacts", profile.getEmergencyContacts());
            context.put("profile", profileBlock);
        });

        List<VitalReading> recentVitals = vitalReadingRepository.findByUserOrderByMeasuredAtDesc(user)
                .stream().limit(25).toList();
        context.put("recentVitals", recentVitals.stream().map(v -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("type", v.getType().name());
            m.put("value", v.getValue());
            m.put("secondaryValue", v.getSecondaryValue());
            m.put("unit", v.getUnit());
            m.put("measuredAt", v.getMeasuredAt() != null ? v.getMeasuredAt().toString() : null);
            m.put("notes", v.getNotes());
            m.put("criticalFlag", v.isCriticalFlag());
            return m;
        }).toList());

        List<Medication> activeMeds = medicationRepository.findByUserAndStatus(user, Medication.Status.ACTIVE)
                .stream().limit(20).toList();
        context.put("activeMedications", activeMeds.stream().map(med -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", med.getName());
            m.put("dosage", med.getDosage());
            m.put("frequency", med.getFrequency());
            m.put("startDate", med.getStartDate() != null ? med.getStartDate().toString() : null);
            m.put("endDate", med.getEndDate() != null ? med.getEndDate().toString() : null);
            m.put("instructions", med.getInstructions());
            m.put("status", med.getStatus() != null ? med.getStatus().name() : null);
            return m;
        }).toList());

        List<Appointment> upcoming = appointmentRepository.findByUserAndStatusOrderByAppointmentDateTimeAsc(user, Appointment.Status.UPCOMING)
                .stream().limit(10).toList();
        context.put("upcomingAppointments", upcoming.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("title", a.getTitle());
            m.put("doctorName", a.getDoctorName());
            m.put("appointmentDateTime", a.getAppointmentDateTime() != null ? a.getAppointmentDateTime().toString() : null);
            m.put("location", a.getLocation());
            m.put("notes", a.getNotes());
            m.put("status", a.getStatus() != null ? a.getStatus().name() : null);
            return m;
        }).toList());

        List<Habit> habits = habitRepository.findByUserOrderByTimeOfDayAsc(user)
                .stream().limit(25).toList();
        context.put("habits", habits.stream().map(h -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("title", h.getTitle());
            m.put("timeOfDay", h.getTimeOfDay());
            m.put("completed", h.getCompleted());
            m.put("aiGenerated", h.getAiGenerated());
            return m;
        }).toList());

        List<HealthReport> recentReports = healthReportRepository.findTop3ByUserOrderByUploadedAtDesc(user);
        context.put("recentHealthReports", recentReports.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("uploadedAt", r.getUploadedAt() != null ? r.getUploadedAt().toString() : null);
            m.put("geminiSummary", r.getGeminiSummary());
            m.put("hfAnalysis", r.getHfAnalysis());
            m.put("criticalFlagged", r.isCriticalFlagged());
            m.put("extractedMetrics", r.getExtractedMetrics());
            return m;
        }).toList());

        return context;
    }

    private String callGeminiText(String prompt) {
        String url = geminiEndpoint + "/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(requestBody, headers), String.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Gemini assistant call failed: " + response.getStatusCode());
            }

            return extractGeminiText(response.getBody()).trim();
        } catch (Exception e) {
            throw new RuntimeException("Gemini assistant call failed", e);
        }
    }

    private String extractGeminiText(String body) {
        try {
            return objectMapper.readTree(body)
                    .path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText("");
        } catch (Exception e) {
            return "";
        }
    }
}
