package com.smartcampus.backend.controller;
import com.smartcampus.backend.model.Technician;
import com.smartcampus.backend.service.TechnicianService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/technicians")
@CrossOrigin(origins = "*")
public class TechnicianController {

    @Autowired
    private TechnicianService technicianService;

    @GetMapping
    public ResponseEntity<List<Technician>> getAllTechnicians() {
        return ResponseEntity.ok(technicianService.getAllTechnicians());
    }

    @PostMapping
    public ResponseEntity<?> createTechnician(@Valid @RequestBody Technician technician, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(technicianService.createTechnician(technician));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTechnician(
        @PathVariable String id,
        @Valid @RequestBody Technician technician,
        BindingResult result
    ) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            return ResponseEntity.ok(technicianService.updateTechnician(id, technician));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTechnician(@PathVariable String id) {
        try {
            technicianService.deleteTechnician(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }
}
