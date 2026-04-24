package com.smartcampus.backend.service;
import com.smartcampus.backend.model.Booking;
import com.smartcampus.backend.model.Resource;
import com.smartcampus.backend.repository.BookingRepository;
import com.smartcampus.backend.repository.ResourceRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private NotificationService notificationService;

    // Create a new booking (auto PENDING + conflict check)
    public Booking createBooking(Booking booking) {
        validateAttendeeCapacity(booking);

        List<Booking> conflicts = bookingRepository.findConflictingBookings(
            booking.getResourceId(),
            booking.getDate(),
            booking.getStartTime(),
            booking.getEndTime()
        );

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("CONFLICT: This resource is already booked for the selected time.");
        }

        booking.setStatus("PENDING");
        Booking saved = bookingRepository.save(booking);
        try { notificationService.notifyBookingCreated(saved); } catch (Exception e) { log.error("Notification error: {}", e.getMessage()); }
        return saved;
    }

    // Get all bookings (Admin)
    public List<Booking> getAllBookings() {
        List<Booking> bookings = bookingRepository.findAll();
        if (!bookings.isEmpty()) {
            return bookings;
        }

        // Fallback: if the mapped collection is empty, try other booking-like collections.
        Set<String> candidateCollections = new LinkedHashSet<>();
        candidateCollections.add("booking");
        candidateCollections.add("Booking");
        candidateCollections.add("Bookings");
        candidateCollections.addAll(mongoTemplate.getCollectionNames());

        for (String collectionName : candidateCollections) {
            String normalized = collectionName.toLowerCase();
            if (!normalized.contains("booking") || normalized.equals("bookings")) {
                continue;
            }

            List<Booking> fallbackResults = mongoTemplate.findAll(Booking.class, collectionName);
            if (!fallbackResults.isEmpty()) {
                return new ArrayList<>(fallbackResults);
            }
        }

        return bookings;
    }

    // Get bookings by user (User views own bookings)
    public List<Booking> getBookingsByUser(String userId) {
        return bookingRepository.findByUserId(userId);
    }

    // Get bookings by status (Admin filter)
    public List<Booking> getBookingsByStatus(String status) {
        return bookingRepository.findByStatus(status);
    }

    // Get single booking by ID
    public Optional<Booking> getBookingById(String id) {
        return bookingRepository.findById(id);
    }

    // Approve booking (Admin)
    public Booking approveBooking(String id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("PENDING")) {
            throw new RuntimeException("Only PENDING bookings can be approved");
        }

        booking.setStatus("APPROVED");
        Booking savedApproved = bookingRepository.save(booking);
        try { notificationService.notifyBookingApproved(savedApproved); } catch (Exception e) { log.error("Notification error: {}", e.getMessage()); }
        return savedApproved;
    }

    // Reject booking (Admin)
    public Booking rejectBooking(String id, String reason) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("PENDING")) {
            throw new RuntimeException("Only PENDING bookings can be rejected");
        }

        booking.setStatus("REJECTED");
        booking.setRejectionReason(reason);
        Booking savedRejected = bookingRepository.save(booking);
        try { notificationService.notifyBookingRejected(savedRejected); } catch (Exception e) { log.error("Notification error: {}", e.getMessage()); }
        return savedRejected;
    }

    // Cancel booking (User)
    public Booking cancelBooking(String id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only APPROVED bookings can be cancelled");
        }

        booking.setStatus("CANCELLED");
        Booking savedCancelled = bookingRepository.save(booking);
        try { notificationService.notifyBookingCancelled(savedCancelled); } catch (Exception e) { log.error("Notification error: {}", e.getMessage()); }
        return savedCancelled;
    }

    // Update booking (only PENDING)
    public Booking updateBooking(String id, Booking updatedBooking) {
        Booking existing = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!existing.getStatus().equals("PENDING")) {
            throw new RuntimeException("Only PENDING bookings can be updated");
        }

        // Merge editable fields into existing document so partial payloads do not lose data.
        existing.setResourceId(updatedBooking.getResourceId() != null ? updatedBooking.getResourceId() : existing.getResourceId());
        existing.setResourceName(updatedBooking.getResourceName() != null ? updatedBooking.getResourceName() : existing.getResourceName());
        existing.setDate(updatedBooking.getDate() != null ? updatedBooking.getDate() : existing.getDate());
        existing.setStartTime(updatedBooking.getStartTime() != null ? updatedBooking.getStartTime() : existing.getStartTime());
        existing.setEndTime(updatedBooking.getEndTime() != null ? updatedBooking.getEndTime() : existing.getEndTime());
        existing.setPurpose(updatedBooking.getPurpose() != null ? updatedBooking.getPurpose() : existing.getPurpose());

        if (updatedBooking.getAttendees() > 0) {
            existing.setAttendees(updatedBooking.getAttendees());
        }

        // Keep user ownership unchanged during edit.
        existing.setUserId(existing.getUserId());
        existing.setStatus("PENDING");
        existing.setRejectionReason(null);

        validateAttendeeCapacity(existing);

        // Check conflicts excluding current booking
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
            existing.getResourceId(),
            existing.getDate(),
            existing.getStartTime(),
            existing.getEndTime()
        ).stream()
            .filter(b -> !b.getId().equals(id))
            .collect(Collectors.toList());

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("CONFLICT: This resource is already booked for the selected time.");
        }

        return bookingRepository.save(existing);
    }

    private void validateAttendeeCapacity(Booking booking) {
        Resource resource = resourceRepository.findById(booking.getResourceId())
            .orElseThrow(() -> new RuntimeException("Selected resource not found."));

        if (booking.getAttendees() > resource.getCapacity()) {
            throw new RuntimeException(
                "ATTENDEES_EXCEEDED: Number of attendees cannot exceed resource capacity (" + resource.getCapacity() + ")."
            );
        }

        // Keep booking resource name aligned with the source of truth.
        booking.setResourceName(resource.getName());
    }

    // Delete booking
    public void deleteBooking(String id) {
        bookingRepository.deleteById(id);
    }
}