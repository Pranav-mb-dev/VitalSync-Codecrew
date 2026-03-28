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
public class VitalReadingResponse {
    private UUID id;
    private String type;
    private Double value;
    private Double secondaryValue;
    private String unit;
    private LocalDateTime measuredAt;
    private String notes;
    private boolean criticalFlag;
    private LocalDateTime createdAt;
}
