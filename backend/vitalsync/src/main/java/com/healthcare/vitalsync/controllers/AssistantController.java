package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.VoiceAssistantRequest;
import com.healthcare.vitalsync.dto.VoiceAssistantResponse;
import com.healthcare.vitalsync.services.VoiceAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final VoiceAssistantService voiceAssistantService;

    @PostMapping("/voice")
    public ResponseEntity<VoiceAssistantResponse> voice(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody VoiceAssistantRequest request
    ) {
        return ResponseEntity.ok(
                voiceAssistantService.answer(
                        userDetails.getUsername(),
                        request.getTranscript(),
                        request.getLanguage()
                )
        );
    }

    @GetMapping("/greet")
    public ResponseEntity<VoiceAssistantResponse> greet(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(voiceAssistantService.greet(userDetails.getUsername()));
    }
}

