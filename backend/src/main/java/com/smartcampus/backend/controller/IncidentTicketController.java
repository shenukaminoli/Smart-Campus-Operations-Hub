package com.smartcampus.backend.controller;
import com.smartcampus.backend.model.IncidentTicket;
import com.smartcampus.backend.service.IncidentTicketService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "*")
public class IncidentTicketController {

    @Autowired
    private IncidentTicketService incidentTicketService;

    @PostMapping
    public ResponseEntity<?> createTicket(@Valid @RequestBody IncidentTicket ticket, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            IncidentTicket created = incidentTicketService.createTicket(ticket);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<IncidentTicket>> getAllTickets() {
        return ResponseEntity.ok(incidentTicketService.getAllTickets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTicketById(@PathVariable String id) {
        Optional<IncidentTicket> ticket = incidentTicketService.getTicketById(id);
        if (ticket.isPresent()) {
            return ResponseEntity.ok(ticket.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Ticket not found"));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<IncidentTicket>> getTicketsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(incidentTicketService.getTicketsByStatus(status));
    }

    @GetMapping("/reporter/{reportedBy}")
    public ResponseEntity<List<IncidentTicket>> getTicketsByReporter(@PathVariable String reportedBy) {
        return ResponseEntity.ok(incidentTicketService.getTicketsByReporter(reportedBy));
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<?> assignTechnician(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            IncidentTicket updated = incidentTicketService.assignTechnician(id, body.get("technicianId"));
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            IncidentTicket updated = incidentTicketService.updateStatus(
                id,
                body.get("status"),
                body.get("resolutionNote"),
                body.get("rejectionReason")
            );
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTicket(@PathVariable String id) {
        try {
            incidentTicketService.deleteTicket(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable String id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(incidentTicketService.addComment(
                id,
                body.get("requesterEmail"),
                body.get("requesterName"),
                body.get("content")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<?> updateComment(
        @PathVariable String ticketId,
        @PathVariable String commentId,
        @RequestBody Map<String, String> body
    ) {
        try {
            return ResponseEntity.ok(incidentTicketService.updateComment(
                ticketId,
                commentId,
                body.get("requesterEmail"),
                body.get("requesterRole"),
                body.get("content")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{ticketId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
        @PathVariable String ticketId,
        @PathVariable String commentId,
        @RequestBody(required = false) Map<String, String> body
    ) {
        try {
            String requesterEmail = body != null ? body.get("requesterEmail") : null;
            String requesterRole = body != null ? body.get("requesterRole") : null;
            return ResponseEntity.ok(incidentTicketService.deleteComment(
                ticketId,
                commentId,
                requesterEmail,
                requesterRole
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }
}
