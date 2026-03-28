package com.healthcare.vitalsync.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoiceAssistantRequest {
    @NotBlank
    private String transcript;

    // BCP-47 language code from the user's app preference, e.g. "ta", "hi", "en"
    private String language;
}

