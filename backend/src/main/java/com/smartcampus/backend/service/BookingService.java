package com.smartcampus.backend.service;
import com.smartcampus.backend.model.Booking;
import com.smartcampus.backend.repository.BookingRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    // Create a new booking (auto PENDING + conflict check)
    public Booking createBooking(Booking booking) {
        // Check for conflicts first
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
        return bookingRepository.findAll();
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

    // Delete booking
    public void deleteBooking(String id) {
        bookingRepository.deleteById(id);
    }
}