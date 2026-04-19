import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookingPage.css';

const API = 'http://localhost:8081/api/bookings';

function BookingPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0
  });
  const [form, setForm] = useState({
    resourceId: '', resourceName: '', date: '',
    startTime: '', endTime: '', userId: '',
    purpose: '', attendees: ''
  });

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [bookings, filterStatus, searchTerm, viewMode, myUserId]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setBookings(res.data);
    } catch (err) {
      showToast('Error fetching bookings', 'error');
    }
    setLoading(false);
  };

  const calculateStats = () => {
    setStats({
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'PENDING').length,
      approved: bookings.filter(b => b.status === 'APPROVED').length,
      rejected: bookings.filter(b => b.status === 'REJECTED').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    });
  };

  const applyFilters = () => {
    let result = [...bookings];
    if (viewMode === 'mine' && myUserId) {
      result = result.filter(b => b.userId === myUserId);
    }
    if (filterStatus !== 'ALL') {
      result = result.filter(b => b.status === filterStatus);
    }
    if (searchTerm) {
      result = result.filter(b =>
        b.resourceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredBookings(result);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (form.startTime >= form.endTime) {
      showToast('End time must be after start time!', 'error');
      return false;
    }
    if (new Date(form.date) < new Date().setHours(0,0,0,0)) {
      showToast('Date cannot be in the past!', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await axios.post(API, form);
      showToast('Booking created successfully!', 'success');
      setForm({
        resourceId: '', resourceName: '', date: '',
        startTime: '', endTime: '', userId: '',
        purpose: '', attendees: ''
      });
      fetchBookings();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        showToast('Conflict! This resource is already booked for this time.', 'error');
      } else {
        showToast('Error creating booking.', 'error');
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/${id}/approve`);
      showToast('Booking approved!', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Cannot approve this booking.', 'error');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await axios.put(`${API}/${id}/reject`, { reason });
      showToast('Booking rejected!', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Cannot reject this booking.', 'error');
    }
  };

  const handleCancel = async (id) => {
    try {
      await axios.put(`${API}/${id}/cancel`);
      showToast('Booking cancelled!', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Cannot cancel this booking.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await axios.delete(`${API}/${id}`);
      showToast('Booking deleted!', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Cannot delete this booking.', 'error');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  const getRowClass = (status) => {
    switch (status) {
      case 'APPROVED': return 'row-approved';
      case 'REJECTED': return 'row-rejected';
      case 'CANCELLED': return 'row-cancelled';
      default: return '';
    }
  };

  return (
    <div className="booking-page">

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      <h1>📅 Booking Management</h1>
      <p className="page-subtitle">Manage campus resource bookings and approvals</p>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card stat-total">
          <h3>{stats.total}</h3>
          <p>Total Bookings</p>
        </div>
        <div className="stat-card stat-pending">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card stat-approved">
          <h3>{stats.approved}</h3>
          <p>Approved</p>
        </div>
        <div className="stat-card stat-rejected">
          <h3>{stats.rejected}</h3>
          <p>Rejected</p>
        </div>
        <div className="stat-card stat-cancelled">
          <h3>{stats.cancelled}</h3>
          <p>Cancelled</p>
        </div>
      </div>

      {/* Booking Form */}
      <div className="booking-form-container">
        <h2>➕ Make a Booking</h2>
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
            <div className="input-group">
              <label>Start Time</label>
              <input name="startTime" type="time"
                value={form.startTime} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <label>End Time</label>
              <input name="endTime" type="time"
                value={form.endTime} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <input name="purpose" placeholder="Purpose of Booking"
              value={form.purpose} onChange={handleChange} required />
            <input name="attendees" type="number" placeholder="Number of Attendees"
              value={form.attendees} onChange={handleChange} required min="1" />
          </div>
          <button type="submit" className="btn-submit">Submit Booking</button>
        </form>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-left">
          <input
            className="search-input"
            placeholder="🔍 Search by resource, user or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-right">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="view-toggle">
            <button
              className={viewMode === 'all' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('all')}>All Bookings</button>
            <button
              className={viewMode === 'mine' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('mine')}>My Bookings</button>
          </div>
          {viewMode === 'mine' && (
            <input
              className="userid-input"
              placeholder="Enter your User ID"
              value={myUserId}
              onChange={(e) => setMyUserId(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bookings-table-container">
        <h2>📋 {viewMode === 'mine' ? 'My Bookings' : 'All Bookings'}
          <span className="booking-count">{filteredBookings.length} records</span>
        </h2>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No bookings found</h3>
            <p>Try adjusting your filters or make a new booking</p>
          </div>
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
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className={getRowClass(booking.status)}>
                  <td><strong>{booking.resourceName}</strong></td>
                  <td>{booking.userId}</td>
                  <td>{booking.date}</td>
                  <td>{booking.startTime} - {booking.endTime}</td>
                  <td>{booking.purpose}</td>
                  <td>{booking.attendees}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="rejection-reason">
                    {booking.rejectionReason || '-'}
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