package com.healthcare.vitalsync.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vital_readings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VitalReading {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VitalType type;

    /** Primary value (for BP this is systolic, for others it's the main reading) */
    @Column(nullable = false)
    private Double value;

    /** Secondary value — used for BP diastolic reading */
    private Double secondaryValue;

    private String unit;         // e.g. "mmHg", "mg/dL", "kg", "bpm"

    private LocalDateTime measuredAt;

    @Column(length = 1024)
    private String notes;

    /** Whether this reading exceeded a critical threshold */
    @Builder.Default
    private boolean criticalFlag = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum VitalType {
        BLOOD_PRESSURE,
        BLOOD_SUGAR,
        HEART_RATE,
        WEIGHT,
        OXYGEN_SATURATION,
        TEMPERATURE
    }
}
