package com.healthcare.vitalsync.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

@Component
public class SupabaseAuthClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.anon-key}")
    private String anonKey;

    public SupabaseTokenResponse signup(String email, String password) {
        String url = supabaseUrl + "/auth/v1/signup";
        return executeAuthRequest(url, email, password);
    }

    public SupabaseTokenResponse login(String email, String password) {
        String url = supabaseUrl + "/auth/v1/token?grant_type=password";
        return executeAuthRequest(url, email, password);
    }

    private SupabaseTokenResponse executeAuthRequest(String url, String email, String password) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", anonKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = Map.of(
                "email", email,
                "password", password
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("access_token")) {
                throw new RuntimeException("Failed to get access token from Supabase");
            }
            
            // In signup, the user info is nested or returned directly
            Map<String, Object> userObj = (Map<String, Object>) responseBody.get("user");
            if (userObj == null) {
                // If user is absent (maybe email conf required), throw
                throw new RuntimeException("User object missing in Supabase response. Ensure email confirmation is disabled.");
            }
            
            return new SupabaseTokenResponse(
                    UUID.fromString((String) userObj.get("id")),
                    (String) responseBody.get("access_token")
            );
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Supabase Auth Error: " + e.getResponseBodyAsString());
        }
    }

    public String getEmailFromToken(String accessToken) {
        String url = supabaseUrl + "/auth/v1/user";
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", anonKey);
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            Map<String, Object> body = response.getBody();
            if (body != null && body.containsKey("email")) {
                return (String) body.get("email");
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public void logout(String accessToken) {
        String url = supabaseUrl + "/auth/v1/logout";
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", anonKey);
        headers.setBearerAuth(accessToken.replace("Bearer ", ""));

        HttpEntity<Void> request = new HttpEntity<>(headers);
        try {
            restTemplate.postForEntity(url, request, Void.class);
        } catch (HttpClientErrorException e) {
            System.err.println("Supabase logout failed: " + e.getResponseBodyAsString());
        }
    }

    public record SupabaseTokenResponse(UUID userId, String accessToken) {}
}
