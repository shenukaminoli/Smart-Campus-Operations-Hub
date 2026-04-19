import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingPage.css';

const API = 'http://localhost:8081/api/bookings';

function BookingPage() {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    resourceId: '',
    resourceName: '',
    date: '',
    startTime: '',
    endTime: '',
    userId: '',
    purpose: '',
    attendees: ''
  });

  // Load all bookings
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(API);
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching bookings', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Create booking
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API, form);
      setMessage('✅ Booking created successfully!');
      setForm({
        resourceId: '', resourceName: '', date: '',
        startTime: '', endTime: '', userId: '',
        purpose: '', attendees: ''
      });
      fetchBookings();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setMessage('❌ Conflict! This resource is already booked for this time.');
      } else {
        setMessage('❌ Error creating booking.');
      }
    }
  };

  // Approve booking
  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/${id}/approve`);
      setMessage('✅ Booking approved!');
      fetchBookings();
    } catch (err) {
      setMessage('❌ Cannot approve this booking.');
    }
  };

  // Reject booking
  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await axios.put(`${API}/${id}/reject`, { reason });
      setMessage('✅ Booking rejected!');
      fetchBookings();
    } catch (err) {
      setMessage('❌ Cannot reject this booking.');
    }
  };

  // Cancel booking
  const handleCancel = async (id) => {
    try {
      await axios.put(`${API}/${id}/cancel`);
      setMessage('✅ Booking cancelled!');
      fetchBookings();
    } catch (err) {
      setMessage('❌ Cannot cancel this booking.');
    }
  };

  // Delete booking
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/${id}`);
      setMessage('✅ Booking deleted!');
      fetchBookings();
    } catch (err) {
      setMessage('❌ Cannot delete this booking.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="booking-page">
      <h1>📅 Booking Management</h1>

      {message && (
        <div className="message">{message}</div>
      )}

      {/* Booking Form */}
      <div className="booking-form-container">
        <h2>Make a Booking</h2>
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-row">
            <input name="resourceId" placeholder="Resource ID (e.g. room101)"
              value={form.resourceId} onChange={handleChange} required />
            <input name="resourceName" placeholder="Resource Name (e.g. Lecture Hall 101)"
              value={form.resourceName} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <input name="userId" placeholder="Your User ID"
              value={form.userId} onChange={handleChange} required />
            <input name="date" type="date"
              value={form.date} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <input name="startTime" type="time"
              value={form.startTime} onChange={handleChange} required />
            <input name="endTime" type="time"
              value={form.endTime} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <input name="purpose" placeholder="Purpose"
              value={form.purpose} onChange={handleChange} required />
            <input name="attendees" type="number" placeholder="Number of Attendees"
              value={form.attendees} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-submit">Submit Booking</button>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bookings-table-container">
        <h2>All Bookings</h2>
        {bookings.length === 0 ? (
          <p className="no-bookings">No bookings found.</p>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>User</th>
                <th>Date</th>
                <th>Time</th>
                <th>Purpose</th>
                <th>Attendees</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.resourceName}</td>
                  <td>{booking.userId}</td>
                  <td>{booking.date}</td>
                  <td>{booking.startTime} - {booking.endTime}</td>
                  <td>{booking.purpose}</td>
                  <td>{booking.attendees}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="action-buttons">
                    {booking.status === 'PENDING' && (
                      <>
                        <button className="btn-approve"
                          onClick={() => handleApprove(booking.id)}>Approve</button>
                        <button className="btn-reject"
                          onClick={() => handleReject(booking.id)}>Reject</button>
                      </>
                    )}
                    {booking.status === 'APPROVED' && (
                      <button className="btn-cancel"
                        onClick={() => handleCancel(booking.id)}>Cancel</button>
                    )}
                    <button className="btn-delete"
                      onClick={() => handleDelete(booking.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BookingPage;