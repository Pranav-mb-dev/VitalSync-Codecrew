package com.healthcare.vitalsync.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietRequest {
    private String name;
    private String description;
    private String frequency; // morning, afternoon, evening, night
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalDays;
    private Integer daysLeft;
}
