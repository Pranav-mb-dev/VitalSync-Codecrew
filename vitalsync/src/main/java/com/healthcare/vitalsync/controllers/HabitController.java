package com.healthcare.vitalsync.controllers;

import com.healthcare.vitalsync.dto.HabitDto;
import com.healthcare.vitalsync.services.HabitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/habits")
@RequiredArgsConstructor
public class HabitController {

    private final HabitService habitService;

    @GetMapping
    public ResponseEntity<List<HabitDto>> getHabits(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(habitService.getHabits(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<HabitDto> addHabit(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody HabitDto dto) {
        return ResponseEntity.ok(habitService.addHabit(userDetails.getUsername(), dto));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<HabitDto> toggleHabit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        boolean completed = body.getOrDefault("completed", false);
        return ResponseEntity.ok(habitService.toggleHabit(userDetails.getUsername(), id, completed));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabitDto> updateHabit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody HabitDto dto) {
        return ResponseEntity.ok(habitService.updateHabit(userDetails.getUsername(), id, dto));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHabit(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        habitService.deleteHabit(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generate")
    public ResponseEntity<List<HabitDto>> generateAiHabits(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(habitService.generateAiHabits(userDetails.getUsername()));
    }
}
