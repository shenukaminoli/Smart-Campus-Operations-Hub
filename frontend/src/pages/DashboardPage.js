import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import '../styles/DashboardPage.css';

const API = 'http://localhost:8081/api/bookings';

const COLORS = {
  PENDING: '#FFB800',
  APPROVED: '#4caf50',
  REJECTED: '#ef5350',
  CANCELLED: '#90a4ae'
};

function DashboardPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching bookings', err);
    }
    setLoading(false);
  };

  // Stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    approved: bookings.filter(b => b.status === 'APPROVED').length,
    rejected: bookings.filter(b => b.status === 'REJECTED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  // Pie chart data
  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'Approved', value: stats.approved },
    { name: 'Rejected', value: stats.rejected },
    { name: 'Cancelled', value: stats.cancelled },
  ].filter(d => d.value > 0);

  // Bar chart — bookings per resource
  const resourceMap = {};
  bookings.forEach(b => {
    if (b.resourceName) {
      resourceMap[b.resourceName] = (resourceMap[b.resourceName] || 0) + 1;
    }
  });
  const resourceData = Object.entries(resourceMap).map(([name, count]) => ({
    name, count
  }));

  // Bar chart — bookings per date
  const dateMap = {};
  bookings.forEach(b => {
    if (b.date) {
      dateMap[b.date] = (dateMap[b.date] || 0) + 1;
    }
  });
  const dateData = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Most booked resource
  const mostBooked = resourceData.sort((a, b) => b.count - a.count)[0];

  const exportRecentBookingsToCSV = () => {
    const headers = ['Resource', 'User', 'Date', 'Purpose', 'Status'];
    const rows = bookings.slice(0, 5).map(b => [
      b.resourceName,
      b.userId,
      b.date,
      b.purpose,
      b.status,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recent-bookings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshBookings = async () => {
    await fetchBookings();
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API}/${id}/approve`);
      await refreshBookings();
    } catch (err) {
      window.alert('Cannot approve this booking.');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await axios.put(`${API}/${id}/reject`, { reason });
      await refreshBookings();
    } catch (err) {
      window.alert('Cannot reject this booking.');
    }
  };

  const handleCancel = async (id) => {
    try {
      await axios.put(`${API}/${id}/cancel`);
      await refreshBookings();
    } catch (err) {
      window.alert('Cannot cancel this booking.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await axios.delete(`${API}/${id}`);
      await refreshBookings();
    } catch (err) {
      window.alert('Cannot delete this booking.');
    }
  };

  const handleEditClick = (booking) => {
    if (booking.status !== 'PENDING') {
      window.alert('Only PENDING bookings can be edited!');
      return;
    }
    setEditingBooking({ ...booking });
  };

  const handleEditChange = (e) => {
    setEditingBooking({ ...editingBooking, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editingBooking.startTime >= editingBooking.endTime) {
      window.alert('End time must be after start time!');
      return;
    }
    try {
      await axios.put(`${API}/${editingBooking.id}`, editingBooking);
      setEditingBooking(null);
      await refreshBookings();
    } catch (err) {
      if (err.response && err.response.status === 409) {
        window.alert('Conflict! This resource is already booked for this time.');
      } else {
        window.alert('Error updating booking.');
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1>📊 Dashboard</h1>
      <p className="page-subtitle">Overview of all campus resource bookings</p>

      {/* Summary Cards */}
      <div className="dashboard-stats">
        <div className="dash-card dash-total">
          <div className="dash-icon">📋</div>
          <div>
            <h3>{stats.total}</h3>
            <p>Total Bookings</p>
          </div>
        </div>
        <div className="dash-card dash-pending">
          <div className="dash-icon">⏳</div>
          <div>
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="dash-card dash-approved">
          <div className="dash-icon">✅</div>
          <div>
            <h3>{stats.approved}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className="dash-card dash-rejected">
          <div className="dash-icon">❌</div>
          <div>
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="dash-card dash-cancelled">
          <div className="dash-icon">🚫</div>
          <div>
            <h3>{stats.cancelled}</h3>
            <p>Cancelled</p>
          </div>
        </div>
        {mostBooked && (
          <div className="dash-card dash-popular">
            <div className="dash-icon">🏆</div>
            <div>
              <h3>{mostBooked.name}</h3>
              <p>Most Booked Resource</p>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="charts-row">

        {/* Pie Chart */}
        <div className="chart-card">
          <h2>Booking Status Distribution</h2>
          {pieData.length === 0 ? (
            <div className="no-data">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[entry.name.toUpperCase()] || '#003366'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resource Bar Chart */}
        <div className="chart-card">
          <h2>Bookings per Resource</h2>
          {resourceData.length === 0 ? (
            <div className="no-data">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#003366" radius={[6, 6, 0, 0]}
                  label={{ position: 'top', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Date Bar Chart */}
      <div className="chart-card full-width">
        <h2>Bookings per Date</h2>
        {dateData.length === 0 ? (
          <div className="no-data">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Bookings" fill="#FFB800"
                radius={[6, 6, 0, 0]}
                label={{ position: 'top', fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Bookings */}
      <div className="chart-card full-width">
        <div className="recent-bookings-header">
          <div>
            <h2>Recent Bookings</h2>
            <p>Latest booking activity across the campus</p>
          </div>
          <div className="actions-section">
            <span className="actions-label">Actions</span>
            <button className="btn-export" onClick={exportRecentBookingsToCSV}>⬇ Export CSV</button>
          </div>
        </div>
        <table className="recent-table">
          <thead>
            <tr>
              <th>Resource</th>
              <th>User</th>
              <th>Date</th>
              <th>Time</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.slice(0, 5).map(b => (
              <tr key={b.id}>
                <td>{b.resourceName}</td>
                <td>{b.userId}</td>
                <td>{b.date}</td>
                <td>{b.startTime} - {b.endTime}</td>
                <td>{b.purpose}</td>
                <td>
                  <span className={`status-badge status-${b.status?.toLowerCase()}`}>
                    {b.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons dashboard-action-buttons">
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn-approve" onClick={() => handleApprove(b.id)}>Approve</button>
                        <button className="btn-reject" onClick={() => handleReject(b.id)}>Reject</button>
                        <button className="btn-edit" onClick={() => handleEditClick(b)}>Edit</button>
                      </>
                    )}
                    {b.status === 'APPROVED' && (
                      <button className="btn-cancel" onClick={() => handleCancel(b.id)}>Cancel</button>
                    )}
                    <button className="btn-delete" onClick={() => handleDelete(b.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  <input name="resourceName" value={editingBooking.resourceName} onChange={handleEditChange} required />
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
                  <input name="attendees" type="number" value={editingBooking.attendees} onChange={handleEditChange} required min="1" />
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

export default DashboardPage;