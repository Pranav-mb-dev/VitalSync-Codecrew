package com.healthcare.vitalsync.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String fullName;

    private LocalDate dateOfBirth;

    private String bloodType;   // e.g. "A+", "O-"

    @Column(length = 1024)
    private String allergies;

    @Column(length = 2048)
    private String medicalConditions;

    private String avatarUrl;

    // Phone number for emergency SMS fallback
    private String phoneNumber;

    @Column(name = "emergency_contacts", length = 2048)
    private String emergencyContactsRaw;

    @Transient
    public List<String> getEmergencyContacts() {
        if (emergencyContactsRaw == null || emergencyContactsRaw.isBlank()) {
            return java.util.Collections.emptyList();
        }
        return java.util.Arrays.stream(emergencyContactsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    @Transient
    public void setEmergencyContacts(List<String> contacts) {
        if (contacts == null || contacts.isEmpty()) {
            this.emergencyContactsRaw = null;
        } else {
            this.emergencyContactsRaw = String.join(",", contacts);
        }
    }
}
