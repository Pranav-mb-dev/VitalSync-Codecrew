package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.TtsRequest;
import com.healthcare.vitalsync.dto.TtsResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.*;

/**
 * Calls Google Cloud Text-to-Speech REST API using a service account JSON key.
 * Supports all GCP TTS voices including Tamil (ta-IN), Hindi (hi-IN), etc.
 */
@Service
@Slf4j
public class GcpTtsService {

    private static final String TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
    private static final String TTS_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Service account details loaded from vitalsync-keys.json
    private String clientEmail;
    private String privateKeyPem;

    // Cached access token
    private String cachedToken;
    private long tokenExpiresAt = 0;

    public GcpTtsService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        loadServiceAccount();
    }

    private void loadServiceAccount() {
        try {
            ClassPathResource resource = new ClassPathResource("vitalsync-keys.json");
            JsonNode json = objectMapper.readTree(resource.getInputStream());
            this.clientEmail = json.get("client_email").asText();
            this.privateKeyPem = json.get("private_key").asText();
            log.info("GCP TTS: Loaded service account for {}", clientEmail);
        } catch (Exception e) {
            log.warn("GCP TTS: Could not load vitalsync-keys.json — TTS will fall back gracefully. {}", e.getMessage());
            this.clientEmail = null;
            this.privateKeyPem = null;
        }
    }

    public TtsResponse synthesize(TtsRequest request) {
        if (clientEmail == null || privateKeyPem == null) {
            throw new RuntimeException("GCP service account not configured");
        }

        String token = getAccessToken();
        String languageCode = request.getLanguageCode() != null ? request.getLanguageCode() : "en-IN";
        String voiceName = request.getVoiceName() != null ? request.getVoiceName() : bestVoiceFor(languageCode);

        // Use SSML for more natural, conversational Indian speech
        String ssml = toSsml(request.getText(), languageCode);

        Map<String, Object> body = Map.of(
            "input", Map.of("ssml", ssml),          // SSML for natural prosody
            "voice", Map.of(
                "languageCode", languageCode,
                "name", voiceName
            ),
            "audioConfig", Map.of(
                "audioEncoding", "MP3",
                "speakingRate", 0.90,               // Slightly slower = more natural Indian pace
                "pitch", 1.5,                       // Slight pitch lift = friendly, warm tone
                "volumeGainDb", 1.0,
                "sampleRateHertz", 24000,
                "effectsProfileId", List.of("headphone-class-device", "small-bluetooth-speaker-class-device")
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                TTS_ENDPOINT, new HttpEntity<>(objectMapper.writeValueAsString(body), headers), String.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("GCP TTS API error: " + response.getStatusCode());
            }

            JsonNode node = objectMapper.readTree(response.getBody());
            String audioContent = node.path("audioContent").asText();

            return TtsResponse.builder()
                .audioContent(audioContent)
                .languageCode(languageCode)
                .build();

        } catch (Exception e) {
            throw new RuntimeException("GCP TTS synthesis failed: " + e.getMessage(), e);
        }
    }

    /**
     * Wraps plain text in SSML for more natural, human-like Indian speech.
     * Adds breathing pauses at sentence boundaries and softens question endings.
     */
    private String toSsml(String text, String languageCode) {
        if (text == null) return "<speak></speak>";
        // Escape XML special chars
        String escaped = text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");

        // Add natural pauses after sentence-ending punctuation
        escaped = escaped
            .replaceAll("([.!?।])\\s+", "$1<break time=\"400ms\"/>")  // Indian full stop ।
            .replaceAll(",\\s+", ",<break time=\"150ms\"/>");

        return "<speak><prosody rate=\"90%\" pitch=\"+1.5st\">" + escaped + "</prosody></speak>";
    }

    /**
     * Best Neural2 voice for each Indian language.
     * Neural2 > WaveNet — more natural, better accent, better prosody.
     * Falls back to WaveNet if Neural2 is unavailable for a language.
     */
    private String bestVoiceFor(String languageCode) {
        return switch (languageCode) {
            // English with authentic Indian accent — Neural2 (best available)
            case "en-IN" -> "en-IN-Neural2-D";   // Female, Indian English
            // Tamil — Neural2
            case "ta-IN" -> "ta-IN-Wavenet-D";    // Neural2 not yet available for Tamil; WaveNet is best
            // Hindi — Neural2
            case "hi-IN" -> "hi-IN-Neural2-D";    // Female, natural Hindi
            // Telugu — Neural2
            case "te-IN" -> "te-IN-Wavenet-D";
            // Malayalam
            case "ml-IN" -> "ml-IN-Wavenet-D";
            // Kannada
            case "kn-IN" -> "kn-IN-Wavenet-D";
            // Marathi
            case "mr-IN" -> "mr-IN-Wavenet-C";
            // Bengali
            case "bn-IN" -> "bn-IN-Wavenet-D";
            // Gujarati
            case "gu-IN" -> "gu-IN-Wavenet-C";
            // Punjabi
            case "pa-IN" -> "pa-IN-Wavenet-D";
            default     -> "en-IN-Neural2-D";
        };
    }

    /** Gets a cached OAuth2 access token via Service Account JWT */
    private synchronized String getAccessToken() {
        long now = Instant.now().getEpochSecond();
        if (cachedToken != null && now < tokenExpiresAt - 60) {
            return cachedToken;
        }

        try {
            // Build JWT claim set
            long iat = now;
            long exp = now + 3600;

            String header = base64url(objectMapper.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
            String claims = base64url(objectMapper.writeValueAsBytes(Map.of(
                "iss", clientEmail,
                "scope", TTS_SCOPE,
                "aud", TOKEN_ENDPOINT,
                "iat", iat,
                "exp", exp
            )));

            String signingInput = header + "." + claims;
            String signature = signRS256(signingInput);
            String jwt = signingInput + "." + signature;

            // Exchange JWT for access token
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String formBody = "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt;

            ResponseEntity<String> response = restTemplate.postForEntity(
                TOKEN_ENDPOINT, new HttpEntity<>(formBody, headers), String.class
            );

            JsonNode tokenNode = objectMapper.readTree(response.getBody());
            cachedToken = tokenNode.get("access_token").asText();
            tokenExpiresAt = now + tokenNode.path("expires_in").asLong(3600);

            return cachedToken;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get GCP access token: " + e.getMessage(), e);
        }
    }

    private String signRS256(String data) throws Exception {
        String pem = privateKeyPem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(pem);
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(keyBytes);
        PrivateKey privateKey = KeyFactory.getInstance("RSA").generatePrivate(keySpec);

        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(privateKey);
        signer.update(data.getBytes(StandardCharsets.UTF_8));

        return Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign());
    }

    private String base64url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}
