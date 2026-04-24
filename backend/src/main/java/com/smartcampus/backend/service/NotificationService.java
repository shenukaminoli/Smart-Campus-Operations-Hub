package com.smartcampus.backend.service;

import com.smartcampus.backend.model.Booking;
import com.smartcampus.backend.model.IncidentTicket;
import com.smartcampus.backend.model.Notification;
import com.smartcampus.backend.model.Role;
import com.smartcampus.backend.model.User;
import com.smartcampus.backend.repository.NotificationRepository;
import com.smartcampus.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    public Notification createNotification(String recipientId, String type, String title,
                                           String message, String referenceId, String referenceType) {
        Notification n = new Notification();
        n.setRecipientId(recipientId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setReferenceId(referenceId);
        n.setReferenceType(referenceType);
        n.setRead(false);
        return notificationRepository.save(n);
    }

    public List<Notification> getNotificationsByUser(String userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    public Optional<Notification> markAsRead(String notificationId) {
        return notificationRepository.findById(notificationId).map(n -> {
            n.setRead(true);
            return notificationRepository.save(n);
        });
    }

    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository
                .findByRecipientIdAndReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    public void deleteNotification(String notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    public void clearAllNotifications(String userId) {
        notificationRepository.deleteByRecipientId(userId);
    }

    // --- Booking helpers ---

    public void notifyBookingApproved(Booking booking) {
        try {
            createNotification(
                booking.getUserId(), "BOOKING_APPROVED", "Booking Approved",
                "Your booking for " + booking.getResourceName() + " on " + booking.getDate() + " has been approved.",
                booking.getId(), "BOOKING"
            );
        } catch (Exception e) {
            log.error("Failed to send booking approved notification: {}", e.getMessage());
        }
    }

    public void notifyBookingRejected(Booking booking) {
        try {
            String suffix = booking.getRejectionReason() != null ? " Reason: " + booking.getRejectionReason() : "";
            createNotification(
                booking.getUserId(), "BOOKING_REJECTED", "Booking Rejected",
                "Your booking for " + booking.getResourceName() + " on " + booking.getDate() + " has been rejected." + suffix,
                booking.getId(), "BOOKING"
            );
        } catch (Exception e) {
            log.error("Failed to send booking rejected notification: {}", e.getMessage());
        }
    }

    public void notifyBookingCancelled(Booking booking) {
        try {
            for (User admin : userRepository.findByRole(Role.ADMIN)) {
                createNotification(
                    admin.getId(), "BOOKING_CANCELLED", "Booking Cancelled",
                    "A booking for " + booking.getResourceName() + " on " + booking.getDate() + " has been cancelled.",
                    booking.getId(), "BOOKING"
                );
            }
        } catch (Exception e) {
            log.error("Failed to send booking cancelled notification: {}", e.getMessage());
        }
    }

    public void notifyBookingCreated(Booking booking) {
        try {
            for (User admin : userRepository.findByRole(Role.ADMIN)) {
                createNotification(
                    admin.getId(), "BOOKING_CREATED", "New Booking Request",
                    "A new booking request for " + booking.getResourceName() + " on " + booking.getDate() + " is awaiting approval.",
                    booking.getId(), "BOOKING"
                );
            }
        } catch (Exception e) {
            log.error("Failed to send booking created notification: {}", e.getMessage());
        }
    }

    // --- Incident helpers ---

    public void notifyIncidentStatusChanged(IncidentTicket ticket, String oldStatus, String newStatus) {
        try {
            if (ticket.getReportedBy() == null || ticket.getReportedBy().isBlank()) return;
            userRepository.findByEmail(ticket.getReportedBy()).ifPresent(user ->
                createNotification(
                    user.getId(), "INCIDENT_STATUS_CHANGED", "Incident Ticket Updated",
                    "Your incident ticket \"" + ticket.getSubject() + "\" status changed from " + oldStatus + " to " + newStatus + ".",
                    ticket.getId(), "INCIDENT"
                )
            );
        } catch (Exception e) {
            log.error("Failed to send incident status changed notification: {}", e.getMessage());
        }
    }

    public void notifyIncidentAssigned(IncidentTicket ticket, String technicianId) {
        try {
            if (ticket.getReportedBy() == null || ticket.getReportedBy().isBlank()) return;
            userRepository.findByEmail(ticket.getReportedBy()).ifPresent(user ->
                createNotification(
                    user.getId(), "INCIDENT_ASSIGNED", "Technician Assigned",
                    "A technician has been assigned to your incident ticket \"" + ticket.getSubject() + "\".",
                    ticket.getId(), "INCIDENT"
                )
            );
        } catch (Exception e) {
            log.error("Failed to send incident assigned notification: {}", e.getMessage());
        }
    }
}
