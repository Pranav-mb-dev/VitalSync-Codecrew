package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthReportResponse {
    private UUID id;
    private String fileUrl;
    private String fileType;
    private String rawExtractedText;
    private String hfAnalysis;
    private String geminiSummary;
    private String extractedMetrics;
    private boolean criticalFlagged;
    private LocalDateTime uploadedAt;
}
