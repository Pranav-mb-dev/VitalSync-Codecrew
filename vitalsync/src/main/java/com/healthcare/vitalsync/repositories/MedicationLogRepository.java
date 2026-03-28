package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Medication;
import com.healthcare.vitalsync.entities.MedicationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationLogRepository extends JpaRepository<MedicationLog, UUID> {
    List<MedicationLog> findByMedicationOrderByTakenAtDesc(Medication medication);
    List<MedicationLog> findByMedicationIdOrderByTakenAtDesc(UUID medicationId);
}
