package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.VitalReading;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VitalReadingRepository extends JpaRepository<VitalReading, UUID> {
    List<VitalReading> findByUserOrderByMeasuredAtDesc(User user);
    List<VitalReading> findByUserAndTypeOrderByMeasuredAtDesc(User user, VitalReading.VitalType type);
    List<VitalReading> findTop10ByUserAndTypeOrderByMeasuredAtDesc(User user, VitalReading.VitalType type);
}
