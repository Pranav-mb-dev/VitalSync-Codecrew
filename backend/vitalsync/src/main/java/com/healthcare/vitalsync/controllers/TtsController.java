package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.TtsRequest;
import com.healthcare.vitalsync.dto.TtsResponse;
import com.healthcare.vitalsync.services.GcpTtsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tts")
@RequiredArgsConstructor
public class TtsController {

    private final GcpTtsService gcpTtsService;

    /**
     * POST /api/tts/synthesize
     * Body: { "text": "...", "languageCode": "ta-IN", "voiceName": "ta-IN-Wavenet-D" }
     * Returns: { "audioContent": "<base64 MP3>", "languageCode": "ta-IN" }
     */
    @PostMapping("/synthesize")
    public ResponseEntity<TtsResponse> synthesize(@RequestBody TtsRequest request) {
        TtsResponse response = gcpTtsService.synthesize(request);
        return ResponseEntity.ok(response);
    }
}
