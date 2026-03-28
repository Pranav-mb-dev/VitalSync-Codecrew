package com.healthcare.vitalsync.services;

import com.healthcare.vitalsync.entities.User;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class UserPreferenceService {

    public static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "en", "English",
            "hi", "Hindi",
            "ta", "Tamil",
            "te", "Telugu",
            "kn", "Kannada",
            "ml", "Malayalam",
            "mr", "Marathi",
            "bn", "Bengali",
            "gu", "Gujarati",
            "pa", "Punjabi"
    );

    public String normalizeLanguageCode(String language) {
        if (language == null || language.isBlank()) {
            return "en";
        }

        String normalized = language.trim().toLowerCase(Locale.ROOT);
        return LANGUAGE_NAMES.containsKey(normalized) ? normalized : "en";
    }

    public String resolveLanguageCode(User user) {
        if (user == null) {
            return "en";
        }
        return normalizeLanguageCode(user.getLanguage());
    }

    public String resolveLanguageName(User user) {
        return LANGUAGE_NAMES.getOrDefault(resolveLanguageCode(user), "English");
    }

    public String plainTextInstruction(User user) {
        return "Respond entirely in " + resolveLanguageName(user) + ".";
    }

    public String structuredJsonInstruction(User user) {
        return "Write all user-facing values in " + resolveLanguageName(user) + ". Keep JSON field names exactly as requested in English.";
    }

    public String localizedReportMetricsInstruction(User user) {
        return "Write the summary in " + resolveLanguageName(user) + ". " +
                "Inside the metrics object, localize biomarker names to " + resolveLanguageName(user) + ", " +
                "but keep metric values as plain ASCII digits with standard medical units only. " +
                "Do not spell out numbers in words. " +
                "Examples of valid values: \"12.5\", \"98\", \"7.2\", \"13.4 g/dL\", \"140 mg/dL\".";
    }
}
