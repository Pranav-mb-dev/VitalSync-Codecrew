package com.healthcare.vitalsync.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sos_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SosAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Human-readable reason e.g. "BP 185/125 — CRITICAL" or "Manual SOS" */
    @Column(nullable = false)
    private String triggerReason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TriggerType triggerType;

    private Double latitude;

    private Double longitude;

    @Builder.Default
    private boolean resolved = false;

    private LocalDateTime resolvedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime triggeredAt;

    public enum TriggerType {
        MANUAL,         // Patient pressed the SOS button
        VITAL_THRESHOLD, // Vitals exceeded critical threshold
        REPORT_FLAGGED  // Medical report had critical values
    }
}
