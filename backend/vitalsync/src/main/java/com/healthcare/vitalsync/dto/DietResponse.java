package com.healthcare.vitalsync.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietResponse {
    private UUID id;
    private String name;
    private String description;
    private String frequency;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalDays;
    private Integer daysLeft;
    private String status;
    private List<String> takenSessionsToday;
    private LocalDateTime lastTakenAt;
    private LocalDateTime createdAt;
}
