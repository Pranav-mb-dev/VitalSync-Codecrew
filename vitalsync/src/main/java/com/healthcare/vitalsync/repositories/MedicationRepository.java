package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Medication;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, UUID> {
    List<Medication> findByUser(User user);
    List<Medication> findByUserAndStatus(User user, Medication.Status status);
    List<Medication> findByUserIdAndStatus(UUID userId, Medication.Status status);
}
