package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TtsRequest {
    private String text;
    private String languageCode; // e.g. "ta-IN", "hi-IN", "en-IN"
    private String voiceName;    // e.g. "ta-IN-Wavenet-D" (optional)
}
