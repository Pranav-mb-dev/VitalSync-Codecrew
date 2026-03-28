package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Diet;
import com.healthcare.vitalsync.entities.DietLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DietLogRepository extends JpaRepository<DietLog, UUID> {
    List<DietLog> findByDietOrderByTakenAtDesc(Diet diet);
}
