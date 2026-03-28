package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.SosAlert;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SosAlertRepository extends JpaRepository<SosAlert, UUID> {
    List<SosAlert> findByUserOrderByTriggeredAtDesc(User user);
    List<SosAlert> findByUserAndResolvedFalseOrderByTriggeredAtDesc(User user);
}
