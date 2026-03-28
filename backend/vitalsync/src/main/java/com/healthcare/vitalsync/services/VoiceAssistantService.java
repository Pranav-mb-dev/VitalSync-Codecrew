package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.VoiceAssistantResponse;
import com.healthcare.vitalsync.entities.*;
import com.healthcare.vitalsync.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
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
    private String geminiApiKeyPrimary;

    @Value("${app.gemini.api-key-secondary}")
    private String geminiApiKeySecondary;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    public VoiceAssistantResponse answer(String requesterEmail, String transcript, String requestLanguageCode) {
        User dataOwner = careContextService.resolveDataOwner(requesterEmail);

        // Determine language: prefer what the client sends, fall back to user's profile language
        String langCode = (requestLanguageCode != null && !requestLanguageCode.isBlank())
                ? userPreferenceService.normalizeLanguageCode(requestLanguageCode)
                : userPreferenceService.resolveLanguageCode(dataOwner);
        String langName = userPreferenceService.LANGUAGE_NAMES.getOrDefault(langCode, "English");

        Map<String, Object> context = buildContextSnapshot(dataOwner);
        String contextJson;
        try {
            contextJson = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            throw new RuntimeException("Could not serialize assistant context: " + e.getMessage(), e);
        }

String prompt = """
                You are Vitya, a caring health companion inside the VitalSync app.
                You are having a VOICE conversation — your reply will be spoken aloud.
                
                === WHO YOU ARE ===
                You are a native %s speaker. You grew up speaking %s.
                You think, feel, and express yourself naturally in %s — NOT by translating from English.
                Use natural, everyday %s the way a close friend or family member would speak.
                Use warm, local phrases and expressions that native speakers actually use.
                
                === LANGUAGE RULES — NON-NEGOTIABLE ===
                - Respond ONLY in %s. Not a single English word unless the language is English.
                - Use natural native phrasing, NOT word-for-word translation from English.
                - Avoid formal, stiff, or dictionary-style language. Sound real and warm.
                
                === FORMAT RULES — NON-NEGOTIABLE ===
                - NO asterisks, NO hashes, NO dashes, NO bullet points, NO markdown whatsoever.
                - Plain spoken sentences only — as if talking face to face.
                - Maximum 2 sentences answering the question.
                - ALWAYS end with a warm, natural follow-up question in %s to keep the conversation going.
                - Example ending questions (adapt to context): "வேறு ஏதாவது சொல்லணுமா?", "और कुछ बताऊं?", "Anything else I can help with?"
                
                === DATA RULES ===
                - Only share facts that exist in the patient data JSON. Never invent values.
                - If data is missing, warmly tell the user where to add it in the app.
                - Never diagnose. For health concerns, gently suggest seeing a doctor.
                
                Current time: %s
                Patient data: %s
                User said: %s
                """.formatted(
                langName, langName, langName, langName,
                langName, langName,
                LocalDateTime.now(),
                contextJson,
                transcript
        );

        String rawAnswer = callGeminiText(prompt);
        String answer = cleanMarkdown(rawAnswer);
        return VoiceAssistantResponse.builder().answer(answer).build();
    }

    public VoiceAssistantResponse chat(String requesterEmail, String transcript) {
        User dataOwner = careContextService.resolveDataOwner(requesterEmail);
        String langCode = userPreferenceService.resolveLanguageCode(dataOwner);
        String langName = UserPreferenceService.LANGUAGE_NAMES.getOrDefault(langCode, "English");

        Map<String, Object> context = buildContextSnapshot(dataOwner);
        String contextJson;
        try {
            contextJson = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            throw new RuntimeException("Could not serialize assistant context: " + e.getMessage(), e);
        }

        String prompt = """
                You are Vitya, a highly intelligent and caring health AI companion inside the VitalSync app.
                You are having a TEXT chat conversation.
                
                === LANGUAGE RULES — NON-NEGOTIABLE ===
                - You are a native %s speaker.
                - Respond ENTIRELY in %s. Not a single English word unless the language is English.
                - Use natural, warm, and professional %s.
                
                === CONTEXT & GOALS ===
                - Use the provided Patient Data JSON to give accurate, personalized advice.
                - If the user asks about their vitals, medications, or reports, look at the data first.
                - Your goal is to help the user manage their chronic conditions (Diabetes, Hypertension, etc.) with empathy.
                
                === FORMATTING ===
                - Use CLEAR, CONCISE sentences.
                - You CAN use simple markdown like bolding for emphasis (e.g. **120/80**).
                - Use emojis occasionally to stay warm and friendly 🌟.
                - Maximum 3-4 sentences per response.
                - End with a helpful follow-up question in %s.
                
                Current time: %s
                Patient data: %s
                User message: %s
                """.formatted(
                langName, langName, langName, langName,
                LocalDateTime.now(),
                contextJson,
                transcript
        );

        String answer = callGeminiText(prompt);
        return VoiceAssistantResponse.builder().answer(answer).build();
    }

    /**
     * Generates an opening greeting in the user's preferred language.
     * Called when the voice chat is first opened.
     */
    public VoiceAssistantResponse greet(String requesterEmail) {
        User dataOwner = careContextService.resolveDataOwner(requesterEmail);
        String langCode = userPreferenceService.resolveLanguageCode(dataOwner);
        String langName = UserPreferenceService.LANGUAGE_NAMES.getOrDefault(langCode, "English");

        String name = "";
        var profileOpt = profileRepository.findByUser(dataOwner);
        if (profileOpt.isPresent() && profileOpt.get().getFullName() != null) {
            name = profileOpt.get().getFullName().split(" ")[0]; // First name only
        }

        String greetPrompt = """
                You are Vitya, a caring health AI companion inside VitalSync.
                Your words will be spoken aloud to the user right now.
                
                Generate a short, warm, natural OPENING GREETING to start a voice health chat.
                
                === WHO YOU ARE ===
                You are a native %s speaker. Greet like a warm local friend, NOT a formal robot.
                Think like someone from their community — use natural, everyday %s expressions.
                
                === RULES ===
                - Respond ENTIRELY in %s. No English unless target language IS English.
                - NO asterisks, NO markdown, NO bullet points. Plain sentences only.
                - 1 to 2 sentences maximum: a warm hello, and an invitation to talk.
                - Address the user by their first name if given: \"%s\"
                - Be warm, friendly, and natural — like a caring friend checking in.
                - End with a natural question asking what they need help with today.
                
                Example style (Tamil): "வணக்கம்! நான் விட்யா, உங்கள் ஆரோக்கிய நண்பன். இன்று என்ன உதவி வேண்டும்?"
                Example style (Hindi): "नमस्ते! मैं विट्या हूं, आपका सेहत का दोस्त। आज मैं आपकी कैसे मदद करूं?"
                Example style (English): "Hey! I'm Vitya, your health buddy. What can I help you with today?"
                """.formatted(langName, langName, langName, name);

        String rawGreeting = callGeminiText(greetPrompt);
        String greeting = cleanMarkdown(rawGreeting);
        return VoiceAssistantResponse.builder().answer(greeting).build();
    }

    /** Strips markdown symbols so the text is safe to speak via TTS. */
    private String cleanMarkdown(String text) {
        if (text == null || text.isBlank()) return text;
        return text
                // Remove bold/italic markers
                .replaceAll("[*_]{1,3}", "")
                // Remove heading markers
                .replaceAll("#+\\s*", "")
                // Remove leading dashes/bullets (list items)
                .replaceAll("(?m)^[-•●▶►]\\s+", "")
                // Remove numbered list markers like "1. "
                .replaceAll("(?m)^\\d+\\.\\s+", "")
                // Collapse multiple blank lines to one
                .replaceAll("\\n{2,}", " ")
                // Collapse newlines into spaces
                .replaceAll("\\n", " ")
                // Collapse multiple spaces
                .replaceAll(" {2,}", " ")
                .trim();
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
        String urlPattern = geminiEndpoint + "/" + geminiModel + ":generateContent?key=%s";

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            return executeGeminiCall(String.format(urlPattern, geminiApiKeyPrimary), entity);
        } catch (Exception e) {
            log.warn("Primary Gemini key failed, attempting secondary key.", e.getMessage());
            try {
                return executeGeminiCall(String.format(urlPattern, geminiApiKeySecondary), entity);
            } catch (Exception ex) {
                log.error("Secondary Gemini key also failed.", ex);
                throw new RuntimeException("Gemini assistant call failed", ex);
            }
        }
    }

    private String executeGeminiCall(String url, HttpEntity<Map<String, Object>> entity) {
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini assistant call failed: " + response.getStatusCode());
        }
        return extractGeminiText(response.getBody()).trim();
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
