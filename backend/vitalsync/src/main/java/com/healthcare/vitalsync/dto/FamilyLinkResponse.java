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
public class FamilyLinkResponse {
    private UUID id;
    private UUID patientId;
    private String patientName;
    private String patientEmail;
    private UUID caregiverId;
    private String caregiverName;
    private String caregiverEmail;
    private String inviteCode;
    private String status;
    private LocalDateTime createdAt;
}
