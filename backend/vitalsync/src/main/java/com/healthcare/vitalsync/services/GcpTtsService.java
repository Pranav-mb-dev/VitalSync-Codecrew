package com.healthcare.vitalsync.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthcare.vitalsync.dto.TtsRequest;
import com.healthcare.vitalsync.dto.TtsResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GcpTtsService {

    private static final String TTS_ENDPOINT =
            "https://texttospeech.googleapis.com/v1/text:synthesize";

    private static final String TOKEN_ENDPOINT =
            "https://oauth2.googleapis.com/token";

    private static final String TTS_SCOPE =
            "https://www.googleapis.com/auth/cloud-platform";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String clientEmail;
    private String privateKeyPem;

    private String cachedToken;
    private long tokenExpiresAt = 0;

    public GcpTtsService(RestTemplate restTemplate, 
                         @org.springframework.beans.factory.annotation.Value("${GOOGLE_APPLICATION_CREDENTIALS_JSON}") String credentialsJson) {
        this.restTemplate = restTemplate;
        loadServiceAccountFromEnv(credentialsJson);
    }

    /**
     * Load service account JSON from environment variable
     */
    private void loadServiceAccountFromEnv(String json) {

        try {

            if (json == null || json.isBlank()) {
                throw new RuntimeException(
                        "Missing GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable"
                );
            }

            JsonNode node = objectMapper.readTree(json);

            this.clientEmail = node.get("client_email").asText();
            this.privateKeyPem = node.get("private_key").asText();

            log.info("GCP TTS loaded service account: {}", clientEmail);

        } catch (Exception e) {

            log.error("Failed loading GCP credentials", e);

            throw new RuntimeException(
                    "Invalid Google service account configuration"
            );
        }
    }

    public TtsResponse synthesize(TtsRequest request) {

        String token = getAccessToken();

        String languageCode =
                request.getLanguageCode() != null
                        ? request.getLanguageCode()
                        : "en-IN";

        String voiceName = bestVoiceFor(languageCode);

        String ssml = toSsml(request.getText());

        Map<String, Object> body = Map.of(
                "input", Map.of("ssml", ssml),
                "voice", Map.of(
                        "languageCode", languageCode,
                        "name", voiceName
                ),
                "audioConfig", Map.of(
                        "audioEncoding", "MP3",
                        "speakingRate", 0.9,
                        "pitch", 1.5,
                        "sampleRateHertz", 24000
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response =
                restTemplate.postForEntity(
                        TTS_ENDPOINT,
                        new HttpEntity<>(
                                toJson(body),
                                headers
                        ),
                        String.class
                );

        try {

            JsonNode node =
                    objectMapper.readTree(response.getBody());

            return TtsResponse.builder()
                    .audioContent(node.get("audioContent").asText())
                    .languageCode(languageCode)
                    .build();

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed parsing TTS response",
                    e
            );
        }
    }

    private String toSsml(String text) {

        if (text == null)
            return "<speak></speak>";

        String escaped =
                text.replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;");

        return "<speak><prosody rate=\"90%\" pitch=\"+1.5st\">"
                + escaped +
                "</prosody></speak>";
    }

    private String bestVoiceFor(String languageCode) {

        return switch (languageCode) {

            case "hi-IN" -> "hi-IN-Neural2-D";
            case "ta-IN" -> "ta-IN-Wavenet-D";
            case "te-IN" -> "te-IN-Wavenet-D";
            case "ml-IN" -> "ml-IN-Wavenet-D";
            default -> "en-IN-Neural2-D";
        };
    }

    /**
     * OAuth token generator
     */
    private synchronized String getAccessToken() {

        long now = Instant.now().getEpochSecond();

        if (cachedToken != null &&
                now < tokenExpiresAt - 60) {

            return cachedToken;
        }

        try {

            long exp = now + 3600;

            String header =
                    base64url(toJsonBytes(
                            Map.of("alg", "RS256", "typ", "JWT")
                    ));

            String claims =
                    base64url(toJsonBytes(
                            Map.of(
                                    "iss", clientEmail,
                                    "scope", TTS_SCOPE,
                                    "aud", TOKEN_ENDPOINT,
                                    "iat", now,
                                    "exp", exp
                            )
                    ));

            String unsigned = header + "." + claims;

            String signature =
                    sign(unsigned);

            String jwt =
                    unsigned + "." + signature;

            HttpHeaders headers =
                    new HttpHeaders();

            headers.setContentType(
                    MediaType.APPLICATION_FORM_URLENCODED
            );

            String body =
                    "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer"
                            + "&assertion=" + jwt;

            ResponseEntity<String> response =
                    restTemplate.postForEntity(
                            TOKEN_ENDPOINT,
                            new HttpEntity<>(body, headers),
                            String.class
                    );

            JsonNode node =
                    objectMapper.readTree(response.getBody());

            cachedToken =
                    node.get("access_token").asText();

            tokenExpiresAt =
                    now + node.get("expires_in").asLong();

            return cachedToken;

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed getting access token",
                    e
            );
        }
    }

    private String sign(String data) throws Exception {

        String pem =
                privateKeyPem
                        .replace("-----BEGIN PRIVATE KEY-----", "")
                        .replace("-----END PRIVATE KEY-----", "")
                        .replaceAll("\\s+", "");

        byte[] decoded =
                Base64.getDecoder().decode(pem);

        PrivateKey key =
                KeyFactory.getInstance("RSA")
                        .generatePrivate(
                                new PKCS8EncodedKeySpec(decoded)
                        );

        Signature signer =
                Signature.getInstance("SHA256withRSA");

        signer.initSign(key);

        signer.update(data.getBytes(
                StandardCharsets.UTF_8
        ));

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                        signer.sign()
                );
    }

    private String base64url(byte[] data) {

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(data);
    }

    private byte[] toJsonBytes(Object obj)
            throws Exception {

        return objectMapper.writeValueAsBytes(obj);
    }

    private String toJson(Object obj) {

        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}