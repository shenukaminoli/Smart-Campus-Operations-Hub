import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/IncidentPage.css';

const API = 'http://localhost:8081/api/tickets';
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const MAX_ATTACHMENTS = 3;
const CATEGORY_OPTIONS = [
  'ELECTRICAL',
  'NETWORK',
  'HVAC',
  'PLUMBING',
  'IT_SUPPORT',
  'SECURITY',
  'GENERAL_MAINTENANCE'
];

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function IncidentPage({ currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [form, setForm] = useState({
    resourceOrLocation: '',
    category: 'GENERAL_MAINTENANCE',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    preferredContact: '',
    reportedBy: currentUser?.email || ''
  });
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const reporter = encodeURIComponent(currentUser?.email || '');
      const res = await axios.get(`${API}/reporter/${reporter}`);
      setTickets(res.data);
    } catch (err) {
      showToast('Error fetching incident tickets', 'error');
    }
    setLoading(false);
  }, [currentUser?.email]);

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
        || ticket.subject?.toLowerCase().includes(term)
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
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (attachmentFiles.length >= MAX_ATTACHMENTS) {
      showToast('Only up to 3 attachments are allowed', 'error');
      setAttachmentFiles([]);
      e.target.value = '';
      return;
    }

    const merged = [...attachmentFiles];
    selectedFiles.forEach((file) => {
      const exists = merged.some((existing) => (
        existing.name === file.name
        && existing.size === file.size
        && existing.lastModified === file.lastModified
      ));
      if (!exists) {
        merged.push(file);
      }
    });

    if (merged.length > MAX_ATTACHMENTS) {
      showToast('Only up to 3 attachments are allowed', 'error');
      setAttachmentFiles([]);
      e.target.value = '';
      return;
    }
    setAttachmentFiles(merged);
    e.target.value = '';
  };

  const removeAttachment = (indexToRemove) => {
    setAttachmentFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (attachmentFiles.length === 0) {
      showToast('Add at least one attachment', 'error');
      return;
    }
    if (attachmentFiles.length > MAX_ATTACHMENTS) {
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
        category: 'GENERAL_MAINTENANCE',
        subject: '',
        description: '',
        priority: 'MEDIUM',
        preferredContact: '',
        reportedBy: currentUser?.email || ''
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

  const jumpToStatus = (status) => {
    setStatusFilter(status);
    const section = document.getElementById('incident-tickets-section');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const canModifyComment = (comment) => {
    const role = currentUser?.role?.toUpperCase();
    return comment.authorEmail === currentUser?.email
      || ['ADMIN', 'STAFF', 'MANAGER', 'TECHNICIAN'].includes(role);
  };

  const handleAddComment = async (ticketId) => {
    const content = window.prompt('Enter your comment');
    if (!content) return;
    try {
      await axios.post(`${API}/${ticketId}/comments`, {
        requesterEmail: currentUser?.email,
        requesterName: currentUser?.fullName,
        content
      });
      showToast('Comment added', 'success');
      fetchTickets();
    } catch (err) {
      showToast(err.response?.data?.error || 'Unable to add comment', 'error');
    }
  };

  const handleEditComment = async (ticketId, comment) => {
    const content = window.prompt('Edit comment', comment.content);
    if (!content) return;
    try {
      await axios.put(`${API}/${ticketId}/comments/${comment.id}`, {
        requesterEmail: currentUser?.email,
        requesterRole: currentUser?.role,
        content
      });
      showToast('Comment updated', 'success');
      fetchTickets();
    } catch (err) {
      showToast(err.response?.data?.error || 'Unable to update comment', 'error');
    }
  };

  const handleDeleteComment = async (ticketId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API}/${ticketId}/comments/${commentId}`, {
        data: {
          requesterEmail: currentUser?.email,
          requesterRole: currentUser?.role
        }
      });
      showToast('Comment deleted', 'success');
      fetchTickets();
    } catch (err) {
      showToast(err.response?.data?.error || 'Unable to delete comment', 'error');
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
        <button className={`incident-stat-card stat-total ${statusFilter === 'ALL' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('ALL')}><h3>{stats.total}</h3><p>Total</p></button>
        <button className={`incident-stat-card stat-open ${statusFilter === 'OPEN' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('OPEN')}><h3>{stats.open}</h3><p>Open</p></button>
        <button className={`incident-stat-card stat-progress ${statusFilter === 'IN_PROGRESS' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('IN_PROGRESS')}><h3>{stats.inProgress}</h3><p>In Progress</p></button>
        <button className={`incident-stat-card stat-resolved ${statusFilter === 'RESOLVED' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('RESOLVED')}><h3>{stats.resolved}</h3><p>Resolved</p></button>
        <button className={`incident-stat-card stat-closed ${statusFilter === 'CLOSED' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('CLOSED')}><h3>{stats.closed}</h3><p>Closed</p></button>
        <button className={`incident-stat-card stat-rejected ${statusFilter === 'REJECTED' ? 'incident-stat-active' : ''}`} onClick={() => jumpToStatus('REJECTED')}><h3>{stats.rejected}</h3><p>Rejected</p></button>
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
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <input
              name="subject"
              placeholder="Subject"
              value={form.subject}
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
              value={form.reportedBy}
              readOnly
              title="Automatically taken from logged in account"
            />
            <div className="file-input-section">
              <input
                id="incident-attachments-input"
                className="hidden-file-input"
                type="file"
                multiple
                disabled={attachmentFiles.length >= MAX_ATTACHMENTS}
                onChange={handleAttachmentChange}
              />
              <label
                htmlFor="incident-attachments-input"
                className={`custom-file-btn ${attachmentFiles.length >= MAX_ATTACHMENTS ? 'custom-file-btn-disabled' : ''}`}
                aria-disabled={attachmentFiles.length >= MAX_ATTACHMENTS}
              >
                Choose Files
              </label>
              <small className="attachment-limit-note">only 3 attachments can submit</small>
              <small className="attachment-counter">
                Attachments selected: {attachmentFiles.length} / {MAX_ATTACHMENTS}
              </small>
            </div>
          </div>
          {attachmentFiles.length > 0 && (
            <div className="selected-attachments">
              {attachmentFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="selected-attachment-item">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="btn-remove-attachment"
                    onClick={() => removeAttachment(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
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

      <div id="incident-tickets-section" className="tickets-table-container">
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
                <th>Subject</th>
                <th>Priority</th>
                <th>Reporter</th>
                <th>Technician</th>
                <th>Status</th>
                <th>Attachments</th>
                <th>Notes</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.resourceOrLocation}</td>
                  <td>{ticket.category}</td>
                  <td>{ticket.subject || '-'}</td>
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
                  <td>
                    <div className="comments-box">
                      {(ticket.comments || []).map((comment) => (
                        <div key={comment.id} className="comment-item">
                          <div className="comment-meta">{comment.authorName || comment.authorEmail}</div>
                          <div className="comment-text">{comment.content}</div>
                          {canModifyComment(comment) && (
                            <div className="comment-actions">
                              <button type="button" onClick={() => handleEditComment(ticket.id, comment)}>Edit</button>
                              <button type="button" onClick={() => handleDeleteComment(ticket.id, comment.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button type="button" className="btn-comment" onClick={() => handleAddComment(ticket.id)}>+ Add Comment</button>
                    </div>
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
