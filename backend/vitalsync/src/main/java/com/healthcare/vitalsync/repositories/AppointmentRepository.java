package com.healthcare.vitalsync.repositories;

import com.healthcare.vitalsync.entities.Appointment;
import com.healthcare.vitalsync.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findByUserOrderByAppointmentDateTimeAsc(User user);
    List<Appointment> findByUserAndStatusOrderByAppointmentDateTimeAsc(User user, Appointment.Status status);
    /** Used to find appointments due for sending reminders */
    List<Appointment> findByReminderSentFalseAndAppointmentDateTimeBetween(
            LocalDateTime from, LocalDateTime to);
}
