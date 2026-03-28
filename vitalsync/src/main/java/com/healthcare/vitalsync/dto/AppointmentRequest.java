package com.healthcare.vitalsync.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AppointmentRequest {
    @NotBlank
    private String title;
    private String doctorName;
    @NotNull
    @Future(message = "Appointment must be in the future")
    private LocalDateTime appointmentDateTime;
    private String location;
    private String notes;
}
