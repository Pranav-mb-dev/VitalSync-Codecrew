package com.healthcare.vitalsync.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    private String doctorName;

    @Column(nullable = false)
    private LocalDateTime appointmentDateTime;

    private String location;

    @Column(length = 2048)
    private String notes;

    /** Set to true once the FCM reminder has been dispatched */
    @Builder.Default
    private boolean reminderSent = false;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Status status = Status.UPCOMING;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum Status {
        UPCOMING, COMPLETED, CANCELLED
    }
}
