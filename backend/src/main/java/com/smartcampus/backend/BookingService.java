package com.smartcampus.backend;

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

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    // Create a new booking (auto PENDING + conflict check)
    public Booking createBooking(Booking booking) {
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
        return bookingRepository.save(booking);
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
        return bookingRepository.save(booking);
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
        return bookingRepository.save(booking);
    }

    // Cancel booking (User)
    public Booking cancelBooking(String id) {
        Booking booking = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!booking.getStatus().equals("APPROVED")) {
            throw new RuntimeException("Only APPROVED bookings can be cancelled");
        }

        booking.setStatus("CANCELLED");
        return bookingRepository.save(booking);
    }

    // Update booking (only PENDING)
    public Booking updateBooking(String id, Booking updatedBooking) {
        Booking existing = bookingRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (!existing.getStatus().equals("PENDING")) {
            throw new RuntimeException("Only PENDING bookings can be updated");
        }

        // Check conflicts excluding current booking
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
            updatedBooking.getResourceId(),
            updatedBooking.getDate(),
            updatedBooking.getStartTime(),
            updatedBooking.getEndTime()
        ).stream()
            .filter(b -> !b.getId().equals(id))
            .collect(Collectors.toList());

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("CONFLICT: This resource is already booked for the selected time.");
        }

        updatedBooking.setId(id);
        updatedBooking.setStatus("PENDING");
        return bookingRepository.save(updatedBooking);
    }

    // Delete booking
    public void deleteBooking(String id) {
        bookingRepository.deleteById(id);
    }
}