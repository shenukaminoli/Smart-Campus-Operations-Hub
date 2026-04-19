package com.smartcampus.backend;

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
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    // POST - Create new booking with validation
    @PostMapping
    public ResponseEntity<?> createBooking(@Valid @RequestBody Booking booking,
                                           BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }
        try {
            Booking created = bookingService.createBooking(booking);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // GET - Admin gets all bookings
    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    // GET - User gets their own bookings
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Booking>> getBookingsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(bookingService.getBookingsByUser(userId));
    }

    // GET - Filter bookings by status
    @GetMapping("/status/{status}")
    public ResponseEntity<List<Booking>> getBookingsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(bookingService.getBookingsByStatus(status));
    }

    // GET - Get single booking by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable String id) {
        Optional<Booking> booking = bookingService.getBookingById(id);
        if (booking.isPresent()) {
            return ResponseEntity.ok(booking.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", "Booking not found"));
    }

    // PUT - Admin approves booking
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approveBooking(@PathVariable String id) {
        try {
            Booking approved = bookingService.approveBooking(id);
            return ResponseEntity.ok(approved);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // PUT - Admin rejects booking with reason
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectBooking(@PathVariable String id,
                                           @RequestBody Map<String, String> body) {
        try {
            String reason = body.get("reason");
            Booking rejected = bookingService.rejectBooking(id, reason);
            return ResponseEntity.ok(rejected);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // PUT - User cancels approved booking
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable String id) {
        try {
            Booking cancelled = bookingService.cancelBooking(id);
            return ResponseEntity.ok(cancelled);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE - Delete a booking
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBooking(@PathVariable String id) {
        try {
            bookingService.deleteBooking(id);
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", e.getMessage()));
        }
    }
}