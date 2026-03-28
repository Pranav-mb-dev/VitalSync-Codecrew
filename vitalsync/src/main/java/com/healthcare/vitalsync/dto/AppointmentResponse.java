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
public class AppointmentResponse {
    private UUID id;
    private String title;
    private String doctorName;
    private LocalDateTime appointmentDateTime;
    private String location;
    private String notes;
    private String status;
    private boolean reminderSent;
    private LocalDateTime createdAt;
}
