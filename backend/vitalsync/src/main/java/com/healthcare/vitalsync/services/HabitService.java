package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.HabitDto;
import com.healthcare.vitalsync.entities.Habit;
import com.healthcare.vitalsync.entities.Profile;
import com.healthcare.vitalsync.entities.User;
import com.healthcare.vitalsync.repositories.HabitRepository;
import com.healthcare.vitalsync.repositories.ProfileRepository;
import com.healthcare.vitalsync.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HabitService {

    private final HabitRepository habitRepository;
    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final RestTemplate restTemplate;
    private final CareContextService careContextService;
    private final UserPreferenceService userPreferenceService;

    @Value("${app.gemini.api-key-primary}")
    private String geminiPrimaryKey;

    @Value("${app.gemini.api-key-secondary}")
    private String geminiSecondaryKey;

    @Value("${app.gemini.model}")
    private String geminiModel;

    @Value("${app.gemini.endpoint}")
    private String geminiEndpoint;

    public List<HabitDto> getHabits(String email) {
        User user = careContextService.resolveDataOwner(email);
        return habitRepository.findByUserOrderByTimeOfDayAsc(user).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public HabitDto addHabit(String email, HabitDto dto) {
        User user = careContextService.resolveDataOwner(email);
        Habit habit = Habit.builder()
                .user(user)
                .title(dto.getTitle())
                .timeOfDay(dto.getTimeOfDay())
                .completed(false)
                .aiGenerated(dto.getAiGenerated() != null ? dto.getAiGenerated() : false)
                .build();
        return toDto(habitRepository.save(habit));
    }

    @Transactional
    public HabitDto toggleHabit(String email, UUID habitId, boolean completed) {
        User requester = getUser(email);
        if (requester.getRole() == User.Role.CAREGIVER) {
            throw new SecurityException("Caregivers cannot log daily progress");
        }
        User user = requester;
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new IllegalArgumentException("Habit not found"));
        
        if (!habit.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized");
        }
        
        habit.setCompleted(completed);
        return toDto(habitRepository.save(habit));
    }

    @Transactional
    public HabitDto updateHabit(String email, UUID habitId, HabitDto dto) {
        User user = careContextService.resolveDataOwner(email);
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new IllegalArgumentException("Habit not found"));

        if (!habit.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized");
        }

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            habit.setTitle(dto.getTitle());
        }
        if (dto.getTimeOfDay() != null && !dto.getTimeOfDay().isBlank()) {
            habit.setTimeOfDay(dto.getTimeOfDay());
        }

        return toDto(habitRepository.save(habit));
    }

    @Transactional
    public void deleteHabit(String email, UUID habitId) {
        User user = careContextService.resolveDataOwner(email);
        Habit habit = habitRepository.findById(habitId).orElseThrow();
        if (habit.getUser().getId().equals(user.getId())) {
            habitRepository.delete(habit);
        }
    }

    @Transactional
    public List<HabitDto> generateAiHabits(String email) {
        User user = careContextService.resolveDataOwner(email);
        String medicalContext = "Healthy adult";
        int age = 30;
        
        try {
            Profile p = profileRepository.findByUser(user).orElse(null);
            if (p != null) {
                if (p.getMedicalConditions() != null) medicalContext = p.getMedicalConditions();
                if (p.getDateOfBirth() != null) {
                    age = java.time.LocalDate.now().getYear() - p.getDateOfBirth().getYear();
                }
            }
        } catch (Exception ignored) {}

        String prompt = String.format("""
                You are a medical AI assistant. Generate 3 simple, daily healthy habits for a %d year old patient with the following conditions: %s.
                Each habit MUST have a title and a time (like '08:00 AM', '02:00 PM').

                Return ONLY a JSON array of objects representing these habits (no markdown, no backticks):
                [
                  { "title": "Drink 2 glasses of water", "timeOfDay": "08:00 AM" }
                ]
                %s
                """, age, medicalContext, userPreferenceService.structuredJsonInstruction(user));

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(
                        Map.of("text", prompt)
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
                log.warn("Primary Gemini key failed, trying secondary...");
                response = restTemplate.postForEntity(String.format(urlPattern, geminiSecondaryKey), new HttpEntity<>(requestBody, headers), String.class);
            }

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String raw = extractGeminiText(response.getBody());
                raw = raw.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                ObjectMapper mapper = new ObjectMapper();
                JsonNode nodes = mapper.readTree(raw);
                
                for (JsonNode node : nodes) {
                    Habit habit = Habit.builder()
                            .user(user)
                            .title(node.path("title").asText())
                            .timeOfDay(node.path("timeOfDay").asText())
                            .completed(false)
                            .aiGenerated(true)
                            .build();
                    habitRepository.save(habit);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to generate AI habits", e);
        }
        
        return getHabits(email);
    }

    // Runs every day at midnight server time to reset tracking
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void resetDailyHabits() {
        log.info("Resetting all daily habits completion status");
        habitRepository.resetAllHabits();
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    private HabitDto toDto(Habit h) {
        return HabitDto.builder()
                .id(h.getId())
                .title(h.getTitle())
                .timeOfDay(h.getTimeOfDay())
                .completed(h.getCompleted() != null ? h.getCompleted() : false)
                .aiGenerated(h.getAiGenerated() != null ? h.getAiGenerated() : false)
                .build();
    }

    private String extractGeminiText(String body) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readTree(body)
                    .path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();
        } catch (Exception e) {
            return "[]";
        }
    }
}
