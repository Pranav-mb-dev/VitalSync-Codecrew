package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Habit;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface HabitRepository extends JpaRepository<Habit, UUID> {
    List<Habit> findByUserOrderByTimeOfDayAsc(User user);

    @Modifying
    @Query("UPDATE Habit h SET h.completed = false")
    void resetAllHabits();
}
