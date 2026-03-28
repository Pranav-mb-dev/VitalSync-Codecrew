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
public class SosAlertResponse {
    private UUID id;
    private UUID userId;
    private String triggerReason;
    private String triggerType;
    private Double latitude;
    private Double longitude;
    private boolean resolved;
    private LocalDateTime resolvedAt;
    private LocalDateTime triggeredAt;
}
