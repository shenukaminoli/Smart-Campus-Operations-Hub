import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getResources } from '../api/resourceApi';
import '../styles/BookingPage.css';

const API = 'http://localhost:8081/api/bookings';

function BookingPage({ currentUser, onOpenAdminDashboard, prefill }) {
  const [bookings, setBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0
  });
  const [form, setForm] = useState({
    resourceId: '', resourceName: '', date: '',
    startTime: '', endTime: '', userId: currentUser?.id || '',
    purpose: '', attendees: ''
  });

  useEffect(() => {
    if (currentUser?.id) {
      fetchBookings();
    }
    fetchResources();
  }, [currentUser]);

  useEffect(() => {
    if (prefill) {
      setForm(prev => ({
        ...prev,
        resourceId: prefill.resourceId || prefill.id || '',
        resourceName: prefill.resourceName || prefill.name || ''
      }));
    }
  }, [prefill]);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [bookings, filterStatus, searchTerm]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/user/${currentUser.id}`);
      setBookings(res.data);
    } catch (err) {
      showToast('Error fetching bookings', 'error');
    }
    setLoading(false);
  };

  const fetchResources = async () => {
    try {
      const res = await getResources();
      setResources(res.data || []);
    } catch (err) {
      showToast('Failed to load resource names', 'error');
    }
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

  const handleResourceChange = (e) => {
    const selectedName = e.target.value;
    const selectedResource = resources.find((r) => r.name === selectedName);

    setForm({
      ...form,
      resourceName: selectedName,
      resourceId: selectedResource?.id || '',
    });
  };

  const handleEditChange = (e) => {
    setEditingBooking({ ...editingBooking, [e.target.name]: e.target.value });
  };

  const handleEditResourceChange = (e) => {
    const selectedName = e.target.value;
    const selectedResource = resources.find((r) => r.name === selectedName);

    setEditingBooking({
      ...editingBooking,
      resourceName: selectedName,
      resourceId: selectedResource?.id || '',
    });
  };

  const handleEditClick = (booking) => {
    if (booking.status !== 'PENDING') {
      showToast('Only PENDING bookings can be edited!', 'error');
      return;
    }
    setEditingBooking({ ...booking });
  };

  const getResourceCapacity = (resourceId, resourceName) => {
    const matched = resources.find((r) => r.id === resourceId)
      || resources.find((r) => r.name === resourceName);
    return matched?.capacity ?? null;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editingBooking.startTime >= editingBooking.endTime) {
      showToast('End time must be after start time!', 'error');
      return;
    }

    const editCapacity = getResourceCapacity(editingBooking.resourceId, editingBooking.resourceName);
    if (editCapacity !== null && Number(editingBooking.attendees) > Number(editCapacity)) {
      showToast(`Number of attendees cannot exceed resource capacity (${editCapacity}).`, 'error');
      return;
    }

    try {
      await axios.put(`${API}/${editingBooking.id}`, editingBooking);
      setEditingBooking(null);
      showToast('Booking updated successfully!', 'success');
      await fetchBookings();
    } catch (err) {
      const apiError = err?.response?.data?.error;
      if (err.response && err.response.status === 409) {
        showToast('Conflict! This resource is already booked for this time.', 'error');
      } else if (apiError) {
        showToast(apiError, 'error');
      } else {
        showToast('Error updating booking.', 'error');
      }
    }
  };

  const validateForm = () => {
    if (form.startTime >= form.endTime) {
      showToast('End time must be after start time!', 'error');
      return false;
    }
    if (new Date(form.date) < new Date().setHours(0, 0, 0, 0)) {
      showToast('Date cannot be in the past!', 'error');
      return false;
    }

    const selectedCapacity = getResourceCapacity(form.resourceId, form.resourceName);
    if (selectedCapacity !== null && Number(form.attendees) > Number(selectedCapacity)) {
      showToast(`Number of attendees cannot exceed resource capacity (${selectedCapacity}).`, 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await axios.post(API, {
        ...form,
        userId: currentUser.id,
      });
      showToast('Booking created successfully!', 'success');
      setForm({
        resourceId: '', resourceName: '', date: '',
        startTime: '', endTime: '', userId: currentUser.id,
        purpose: '', attendees: ''
      });
      fetchBookings();
    } catch (err) {
      const apiError = err?.response?.data?.error;
      if (err.response && err.response.status === 409) {
        showToast('Conflict! This resource is already booked for this time.', 'error');
      } else if (apiError) {
        showToast(apiError, 'error');
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

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Resource', 'User', 'Date', 'Start Time',
      'End Time', 'Purpose', 'Attendees', 'Status', 'Rejection Reason'];
    const rows = filteredBookings.map(b => [
      b.resourceName, b.userId, b.date, b.startTime,
      b.endTime, b.purpose, b.attendees, b.status,
      b.rejectionReason || ''
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Bookings exported successfully!', 'success');
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

  const selectedCapacity = getResourceCapacity(form.resourceId, form.resourceName);
  const editSelectedCapacity = editingBooking
    ? getResourceCapacity(editingBooking.resourceId, editingBooking.resourceName)
    : null;

  return (
    <div className="booking-page">

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      <div className="booking-header">
        <div>
          <h1>📅 Booking Management</h1>
          <p className="page-subtitle">Manage campus resource bookings and approvals</p>
        </div>
        <button className="btn-admin-dashboard" onClick={onOpenAdminDashboard}>
          Booking Admin Dashboard
        </button>
      </div>

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
            <select
              name="resourceName"
              value={form.resourceName}
              onChange={handleResourceChange}
              required
            >
              <option value="">Select Resource Name</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.name}>
                  {resource.name}
                </option>
              ))}
            </select>
            <input
              name="resourceId"
              placeholder="Resource ID"
              value={form.resourceId}
              readOnly
              required
            />
          </div>
          <div className="form-row">
            <div className="input-group">
              <label>User ID (Auto-filled)</label>
              <input
                name="userId"
                placeholder="Your User ID"
                value={form.userId}
                readOnly
                required
              />
            </div>
            <div className="input-group">
              <label>Date</label>
              <input name="date" type="date"
                value={form.date} onChange={handleChange} required />
            </div>
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
            <div className="input-group">
              <label>Number of Attendees</label>
              <input name="attendees" type="number" placeholder="Number of Attendees"
                value={form.attendees} onChange={handleChange} required min="1"
                max={selectedCapacity ?? undefined} />
              {selectedCapacity !== null && (
                <small className="capacity-hint">Max capacity: {selectedCapacity}</small>
              )}
            </div>
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
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bookings-table-container">
        <h2>📋 My Bookings
          <span className="booking-count">{filteredBookings.length} records</span>
          <button className="btn-export" onClick={exportToCSV}>⬇ Export CSV</button>
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
                    {currentUser?.role === 'ADMIN' && booking.status === 'PENDING' && (
                      <>
                        <button className="btn-approve" onClick={() => handleApprove(booking.id)}>Approve</button>
                        <button className="btn-reject" onClick={() => handleReject(booking.id)}>Reject</button>
                      </>
                    )}
                    {currentUser?.role === 'ADMIN' && booking.status === 'APPROVED' && (
                      <button className="btn-cancel" onClick={() => handleCancel(booking.id)}>Cancel</button>
                    )}
                    {booking.status === 'PENDING' && (
                      <button className="btn-edit" onClick={() => handleEditClick(booking)}>Edit</button>
                    )}
                    <button className="btn-delete" onClick={() => handleDelete(booking.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingBooking && (
        <div className="modal-overlay" onClick={() => setEditingBooking(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Booking</h2>
              <button className="modal-close" onClick={() => setEditingBooking(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="edit-form-row">
                  <label>Resource ID</label>
                  <input name="resourceId" value={editingBooking.resourceId} onChange={handleEditChange} required />
                </div>
                <div className="edit-form-row">
                  <label>Resource Name</label>
                  <select
                    name="resourceName"
                    value={editingBooking.resourceName}
                    onChange={handleEditResourceChange}
                    required
                  >
                    <option value="">Select Resource Name</option>
                    {resources.map((resource) => (
                      <option key={resource.id} value={resource.name}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="edit-form-row">
                  <label>Date</label>
                  <input name="date" type="date" value={editingBooking.date} onChange={handleEditChange} required />
                </div>
                <div className="edit-form-row">
                  <label>Start Time</label>
                  <input name="startTime" type="time" value={editingBooking.startTime} onChange={handleEditChange} required />
                </div>
                <div className="edit-form-row">
                  <label>End Time</label>
                  <input name="endTime" type="time" value={editingBooking.endTime} onChange={handleEditChange} required />
                </div>
                <div className="edit-form-row">
                  <label>Purpose</label>
                  <input name="purpose" value={editingBooking.purpose} onChange={handleEditChange} required />
                </div>
                <div className="edit-form-row">
                  <label>Attendees</label>
                  <input
                    name="attendees"
                    type="number"
                    value={editingBooking.attendees}
                    onChange={handleEditChange}
                    required
                    min="1"
                    max={editSelectedCapacity ?? undefined}
                  />
                  {editSelectedCapacity !== null && (
                    <small className="capacity-hint">Max capacity: {editSelectedCapacity}</small>
                  )}
                </div>
                <button type="submit" className="btn-submit" style={{ width: '100%', marginTop: '16px' }}>
                  Update Booking
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;