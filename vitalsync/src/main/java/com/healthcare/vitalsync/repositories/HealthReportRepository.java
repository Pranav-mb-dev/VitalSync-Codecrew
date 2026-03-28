package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.HealthReport;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HealthReportRepository extends JpaRepository<HealthReport, UUID> {
    List<HealthReport> findByUserOrderByUploadedAtDesc(User user);
    List<HealthReport> findTop3ByUserOrderByUploadedAtDesc(User user);
    List<HealthReport> findByUserIdOrderByUploadedAtDesc(UUID userId);
}
