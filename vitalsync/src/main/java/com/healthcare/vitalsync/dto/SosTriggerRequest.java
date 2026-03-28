package com.healthcare.vitalsync.dto;

import lombok.Data;

@Data
public class SosTriggerRequest {
    private Double latitude;
    private Double longitude;
    /** Optional manual reason; defaults to "Manual SOS" */
    private String reason;
}
