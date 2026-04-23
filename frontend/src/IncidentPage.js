import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './IncidentPage.css';

const API = 'http://localhost:8081/api/tickets';
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function IncidentPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState({
    resourceOrLocation: '',
    category: '',
    description: '',
    priority: 'MEDIUM',
    preferredContact: '',
    reportedBy: ''
  });
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setTickets(res.data);
    } catch (err) {
      showToast('Error fetching incident tickets', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length,
    rejected: tickets.filter((t) => t.status === 'REJECTED').length
  }), [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
      const term = search.toLowerCase();
      const matchesSearch = !term
        || ticket.resourceOrLocation?.toLowerCase().includes(term)
        || ticket.category?.toLowerCase().includes(term)
        || ticket.reportedBy?.toLowerCase().includes(term)
        || ticket.assignedTechnicianId?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, statusFilter]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      showToast('Only up to 3 attachments are allowed', 'error');
      return;
    }
    setAttachmentFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (attachmentFiles.length === 0) {
      showToast('Add at least one attachment', 'error');
      return;
    }
    if (attachmentFiles.length > 3) {
      showToast('Only up to 3 attachments are allowed', 'error');
      return;
    }

    try {
      const attachments = await Promise.all(
        attachmentFiles.map(async (file) => {
          const dataUrl = await readFileAsDataUrl(file);
          return {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Content: dataUrl
          };
        })
      );

      await axios.post(API, { ...form, attachments });
      showToast('Incident ticket created successfully', 'success');
      setForm({
        resourceOrLocation: '',
        category: '',
        description: '',
        priority: 'MEDIUM',
        preferredContact: '',
        reportedBy: ''
      });
      setAttachmentFiles([]);
      fetchTickets();
    } catch (err) {
      const message = err.response?.data?.error || 'Error creating ticket';
      showToast(message, 'error');
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'OPEN': return 'status-open';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'RESOLVED': return 'status-resolved';
      case 'CLOSED': return 'status-closed';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <div className="incident-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      <h1>🛠 Incident Ticketing</h1>
      <p className="page-subtitle">
        Create incident reports with attachments and track updates from the ticket manager
      </p>

      <div className="stats-cards">
        <div className="stat-card stat-total"><h3>{stats.total}</h3><p>Total</p></div>
        <div className="stat-card stat-open"><h3>{stats.open}</h3><p>Open</p></div>
        <div className="stat-card stat-progress"><h3>{stats.inProgress}</h3><p>In Progress</p></div>
        <div className="stat-card stat-resolved"><h3>{stats.resolved}</h3><p>Resolved</p></div>
        <div className="stat-card stat-closed"><h3>{stats.closed}</h3><p>Closed</p></div>
        <div className="stat-card stat-rejected"><h3>{stats.rejected}</h3><p>Rejected</p></div>
      </div>

      <div className="incident-form-container">
        <h2>➕ Create Incident Ticket</h2>
        <form className="incident-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              name="resourceOrLocation"
              placeholder="Resource / Location"
              value={form.resourceOrLocation}
              onChange={handleChange}
              required
            />
            <input
              name="category"
              placeholder="Category (Electrical, Network, Facility...)"
              value={form.category}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <select name="priority" value={form.priority} onChange={handleChange} required>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <input
              name="preferredContact"
              placeholder="Preferred Contact"
              value={form.preferredContact}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <input
              name="reportedBy"
              placeholder="Reported By (user ID)"
              value={form.reportedBy}
              onChange={handleChange}
              required
            />
            <input type="file" multiple onChange={handleAttachmentChange} />
          </div>
          <div className="form-row">
            <textarea
              name="description"
              placeholder="Incident description"
              value={form.description}
              onChange={handleChange}
              required
              minLength={10}
            />
          </div>
          <small className="hint">Attachment rule: minimum 1 file, maximum 3 files.</small>
          <button type="submit" className="btn-submit">Submit Ticket</button>
        </form>
      </div>

      <div className="filters-container">
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by location, category, reporter, technician..."
        />
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          {ALLOWED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="tickets-table-container">
        <h2>📋 Incident Tickets <span className="ticket-count">{filtered.length} records</span></h2>
        {loading ? (
          <div className="loading"><div className="spinner"></div><p>Loading tickets...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><h3>No tickets found</h3></div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Reporter</th>
                <th>Technician</th>
                <th>Status</th>
                <th>Attachments</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.resourceOrLocation}</td>
                  <td>{ticket.category}</td>
                  <td>{ticket.priority}</td>
                  <td>{ticket.reportedBy}</td>
                  <td>{ticket.assignedTechnicianId || '-'}</td>
                  <td>
                    <span className={`status-badge ${statusClass(ticket.status)}`}>{ticket.status}</span>
                  </td>
                  <td>
                    <div className="attachments">
                      {(ticket.attachments || []).map((att, i) => (
                        <a key={`${ticket.id}-${i}`} href={att.base64Content} download={att.fileName}>
                          {att.fileName}
                        </a>
                      ))}
                    </div>
                  </td>
                  <td className="notes">
                    {ticket.resolutionNote || ticket.rejectionReason || '-'}
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

export default IncidentPage;
