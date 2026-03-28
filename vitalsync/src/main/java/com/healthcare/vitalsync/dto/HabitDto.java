package com.healthcare.vitalsync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitDto {
    private UUID id;
    private String title;
    private String timeOfDay;
    private Boolean completed;
    private Boolean aiGenerated;
}
