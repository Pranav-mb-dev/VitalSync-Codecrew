package com.healthcare.vitalsync.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    private String dosage;       // e.g. "500mg"

    private String frequency;    // e.g. "Twice daily", "Every 8 hours"

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 1024)
    private String instructions;

    /** Active = still needs to be taken; Completed = course done */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum Status {
        ACTIVE, COMPLETED, PAUSED
    }
}
