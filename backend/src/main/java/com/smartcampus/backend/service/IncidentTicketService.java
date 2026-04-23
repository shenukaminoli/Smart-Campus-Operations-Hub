package com.smartcampus.backend.service;
import com.smartcampus.backend.model.IncidentTicket;
import com.smartcampus.backend.repository.IncidentTicketRepository;
import com.smartcampus.backend.repository.TechnicianRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class IncidentTicketService {

    private static final Set<String> TERMINAL_STATUSES = Set.of("CLOSED", "REJECTED");
    private static final Set<String> BUSY_STATUSES = Set.of("OPEN", "IN_PROGRESS");

    @Autowired
    private IncidentTicketRepository incidentTicketRepository;
    @Autowired
    private TechnicianRepository technicianRepository;

    public IncidentTicket createTicket(IncidentTicket ticket) {
        ticket.setId(null);
        ticket.setStatus("OPEN");
        ticket.setRejectionReason(null);
        ticket.setResolutionNote(null);
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        return incidentTicketRepository.save(ticket);
    }

    public List<IncidentTicket> getAllTickets() {
        return incidentTicketRepository.findAll();
    }

    public List<IncidentTicket> getTicketsByStatus(String status) {
        return incidentTicketRepository.findByStatus(status);
    }

    public List<IncidentTicket> getTicketsByReporter(String reportedBy) {
        return incidentTicketRepository.findByReportedBy(reportedBy);
    }

    public Optional<IncidentTicket> getTicketById(String id) {
        return incidentTicketRepository.findById(id);
    }

    public IncidentTicket assignTechnician(String id, String technicianId) {
        IncidentTicket ticket = getExistingTicket(id);
        if (technicianId == null || technicianId.isBlank()) {
            throw new RuntimeException("Technician ID is required");
        }
        if (TERMINAL_STATUSES.contains(ticket.getStatus())) {
            throw new RuntimeException("Cannot assign technician to a " + ticket.getStatus() + " ticket");
        }

        technicianRepository.findByTechnicianId(technicianId)
            .orElseThrow(() -> new RuntimeException("Technician not found"));
        String previousTechnicianId = ticket.getAssignedTechnicianId();

        // Allow reassignment, but block assigning a technician who is currently busy in another active ticket.
        if (!technicianId.equals(previousTechnicianId) && isTechnicianBusy(technicianId)) {
            throw new RuntimeException("Selected technician is currently not available");
        }

        ticket.setAssignedTechnicianId(technicianId);
        ticket.setUpdatedAt(LocalDateTime.now());
        IncidentTicket saved = incidentTicketRepository.save(ticket);

        // Keep availability in sync with active ticket assignments.
        if (previousTechnicianId != null && !previousTechnicianId.isBlank()) {
            refreshTechnicianAvailability(previousTechnicianId);
        }
        refreshTechnicianAvailability(technicianId);

        return saved;
    }

    public IncidentTicket updateStatus(String id, String status, String resolutionNote, String rejectionReason) {
        IncidentTicket ticket = getExistingTicket(id);
        if (status == null || status.isBlank()) {
            throw new RuntimeException("Status is required");
        }
        status = status.trim().toUpperCase();
        if (!Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED").contains(status)) {
            throw new RuntimeException("Invalid status value");
        }
        String current = ticket.getStatus();

        if (current.equals("OPEN") && !(status.equals("IN_PROGRESS") || status.equals("REJECTED"))) {
            throw new RuntimeException("OPEN tickets can move only to IN_PROGRESS or REJECTED");
        }
        if (current.equals("IN_PROGRESS") && !status.equals("RESOLVED")) {
            throw new RuntimeException("IN_PROGRESS tickets can move only to RESOLVED");
        }
        if (current.equals("RESOLVED") && !status.equals("CLOSED")) {
            throw new RuntimeException("RESOLVED tickets can move only to CLOSED");
        }
        if (TERMINAL_STATUSES.contains(current)) {
            throw new RuntimeException(current + " tickets cannot be changed");
        }

        if (status.equals("IN_PROGRESS") && (ticket.getAssignedTechnicianId() == null || ticket.getAssignedTechnicianId().isBlank())) {
            throw new RuntimeException("Assign a technician before moving to IN_PROGRESS");
        }
        if (status.equals("RESOLVED") && (resolutionNote == null || resolutionNote.isBlank())) {
            throw new RuntimeException("Resolution note is required for RESOLVED status");
        }
        if (status.equals("REJECTED") && (rejectionReason == null || rejectionReason.isBlank())) {
            throw new RuntimeException("Rejection reason is required for REJECTED status");
        }

        ticket.setStatus(status);
        ticket.setUpdatedAt(LocalDateTime.now());

        if (status.equals("RESOLVED")) {
            ticket.setResolutionNote(resolutionNote);
        }
        if (status.equals("REJECTED")) {
            ticket.setRejectionReason(rejectionReason);
        }

        IncidentTicket saved = incidentTicketRepository.save(ticket);
        if (ticket.getAssignedTechnicianId() != null && !ticket.getAssignedTechnicianId().isBlank()) {
            refreshTechnicianAvailability(ticket.getAssignedTechnicianId());
        }
        return saved;
    }

    private IncidentTicket getExistingTicket(String id) {
        return incidentTicketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }

    private boolean isTechnicianBusy(String technicianId) {
        List<IncidentTicket> technicianTickets = incidentTicketRepository.findByAssignedTechnicianId(technicianId);
        return technicianTickets.stream().anyMatch(ticket -> BUSY_STATUSES.contains(ticket.getStatus()));
    }

    private void refreshTechnicianAvailability(String technicianId) {
        technicianRepository.findByTechnicianId(technicianId).ifPresent(technician -> {
            technician.setAvailable(!isTechnicianBusy(technicianId));
            technicianRepository.save(technician);
        });
    }
}
