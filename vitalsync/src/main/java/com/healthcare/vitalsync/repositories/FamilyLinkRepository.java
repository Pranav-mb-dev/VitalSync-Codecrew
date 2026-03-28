package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.FamilyLink;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FamilyLinkRepository extends JpaRepository<FamilyLink, UUID> {
    Optional<FamilyLink> findByInviteCode(String inviteCode);
    List<FamilyLink> findByPatient(User patient);
    List<FamilyLink> findByCaregiver(User caregiver);
    Optional<FamilyLink> findByPatientAndCaregiver(User patient, User caregiver);
}
