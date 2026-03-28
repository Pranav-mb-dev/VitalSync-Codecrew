package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Diet;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DietRepository extends JpaRepository<Diet, UUID> {
    List<Diet> findByUser(User user);
}
