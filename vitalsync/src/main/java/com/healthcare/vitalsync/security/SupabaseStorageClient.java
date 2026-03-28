package com.healthcare.vitalsync.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

@Component
public class SupabaseStorageClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.anon-key}")
    private String anonKey;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    public String uploadFile(byte[] fileBytes, String originalFilename, String mimeType) {
        // The Storage REST API requires a Supabase-signed JWT. Our frontend uses an app-local JWT,
        // so we upload from the server using the Supabase service role key.
        if (serviceRoleKey == null || serviceRoleKey.isBlank()) {
            throw new IllegalStateException("Missing SUPABASE_SERVICE_ROLE_KEY; cannot upload to Supabase Storage");
        }
        
        String extension = originalFilename != null && originalFilename.contains(".") ?
                originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        String uniqueFileName = UUID.randomUUID() + extension;

        String url = supabaseUrl + "/storage/v1/object/health-reports/" + uniqueFileName;

        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", anonKey);
        headers.setBearerAuth(serviceRoleKey);
        headers.setContentType(MediaType.parseMediaType(mimeType != null ? mimeType : "application/octet-stream"));

        HttpEntity<byte[]> request = new HttpEntity<>(fileBytes, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Storage API returned: " + response.getStatusCode());
            }
            return supabaseUrl + "/storage/v1/object/public/health-reports/" + uniqueFileName;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to Supabase Storage: " + e.getMessage(), e);
        }
    }
}
