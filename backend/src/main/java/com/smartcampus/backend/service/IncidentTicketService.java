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
    private static final Set<String> STAFF_ROLES = Set.of("ADMIN", "STAFF", "MANAGER", "TECHNICIAN");

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
        String previousTechnicianId = ticket.getAssignedTechnicianId();
        if (technicianId == null || technicianId.isBlank()) {
            throw new RuntimeException("Technician ID is required");
        }
        if (TERMINAL_STATUSES.contains(ticket.getStatus())) {
            throw new RuntimeException("Cannot assign technician to a " + ticket.getStatus() + " ticket");
        }
        technicianRepository.findByTechnicianId(technicianId)
            .orElseThrow(() -> new RuntimeException("Technician not found"));
        if (!technicianId.equals(previousTechnicianId) && isTechnicianBusy(technicianId)) {
            throw new RuntimeException("Technician is not available");
        }
        ticket.setAssignedTechnicianId(technicianId);
        ticket.setUpdatedAt(LocalDateTime.now());
        IncidentTicket saved = incidentTicketRepository.save(ticket);
        refreshTechnicianAvailability(technicianId);
        if (previousTechnicianId != null && !previousTechnicianId.isBlank() && !previousTechnicianId.equals(technicianId)) {
            refreshTechnicianAvailability(previousTechnicianId);
        }
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

    public void deleteTicket(String id) {
        IncidentTicket existing = incidentTicketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
        String technicianId = existing.getAssignedTechnicianId();
        incidentTicketRepository.deleteById(existing.getId());
        if (technicianId != null && !technicianId.isBlank()) {
            refreshTechnicianAvailability(technicianId);
        }
    }

    public IncidentTicket addComment(String ticketId, String requesterEmail, String requesterName, String content) {
        IncidentTicket ticket = getExistingTicket(ticketId);
        if (requesterEmail == null || requesterEmail.isBlank()) {
            throw new RuntimeException("Requester email is required");
        }
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Comment text is required");
        }
        IncidentTicket.TicketComment comment = new IncidentTicket.TicketComment();
        comment.setAuthorEmail(requesterEmail);
        comment.setAuthorName(requesterName);
        comment.setContent(content.trim());
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpdatedAt(LocalDateTime.now());
        ticket.getComments().add(comment);
        ticket.setUpdatedAt(LocalDateTime.now());
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket updateComment(
        String ticketId,
        String commentId,
        String requesterEmail,
        String requesterRole,
        String content
    ) {
        IncidentTicket ticket = getExistingTicket(ticketId);
        IncidentTicket.TicketComment comment = ticket.getComments().stream()
            .filter(c -> c.getId().equals(commentId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!canModifyComment(comment, requesterEmail, requesterRole)) {
            throw new RuntimeException("You can only edit your own comment");
        }
        if (content == null || content.isBlank()) {
            throw new RuntimeException("Comment text is required");
        }
        comment.setContent(content.trim());
        comment.setUpdatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        return incidentTicketRepository.save(ticket);
    }

    public IncidentTicket deleteComment(String ticketId, String commentId, String requesterEmail, String requesterRole) {
        IncidentTicket ticket = getExistingTicket(ticketId);
        IncidentTicket.TicketComment comment = ticket.getComments().stream()
            .filter(c -> c.getId().equals(commentId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!canModifyComment(comment, requesterEmail, requesterRole)) {
            throw new RuntimeException("You can only delete your own comment");
        }

        ticket.getComments().removeIf(c -> c.getId().equals(commentId));
        ticket.setUpdatedAt(LocalDateTime.now());
        return incidentTicketRepository.save(ticket);
    }

    private boolean canModifyComment(IncidentTicket.TicketComment comment, String requesterEmail, String requesterRole) {
        if (requesterEmail != null && requesterEmail.equalsIgnoreCase(comment.getAuthorEmail())) {
            return true;
        }
        return requesterRole != null && STAFF_ROLES.contains(requesterRole.toUpperCase());
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

    private IncidentTicket getExistingTicket(String id) {
        return incidentTicketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found"));
    }
}
