import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/TicketManagerPage.css';

const TICKETS_API = 'http://localhost:8081/api/tickets';
const TECHNICIANS_API = 'http://localhost:8081/api/technicians';
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];

function TicketManagerPage({ currentUser, onNavigateToTechnicians }) {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketRes, techRes] = await Promise.all([
        axios.get(TICKETS_API),
        axios.get(TECHNICIANS_API)
      ]);
      setTickets(ticketRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      showToast('Failed to load ticket manager data', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const term = ticketSearch.toLowerCase();
    const statusOk = statusFilter === 'ALL' || ticket.status === statusFilter;
    const textOk = !term
      || ticket.resourceOrLocation?.toLowerCase().includes(term)
      || ticket.subject?.toLowerCase().includes(term)
      || ticket.category?.toLowerCase().includes(term)
      || ticket.reportedBy?.toLowerCase().includes(term)
      || ticket.assignedTechnicianId?.toLowerCase().includes(term);
    return statusOk && textOk;
  }), [tickets, ticketSearch, statusFilter]);

  const busyTechnicianIds = useMemo(() => new Set(
    tickets
      .filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status))
      .map((ticket) => ticket.assignedTechnicianId)
      .filter(Boolean)
  ), [tickets]);

  const assignTechnician = async (ticketId, technicianId) => {
    if (!technicianId) return;
    try {
      await axios.put(`${TICKETS_API}/${ticketId}/assign`, { technicianId });
      showToast('Technician assigned to ticket', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to assign technician', 'error');
    }
  };

  const updateStatus = async (ticketId, status) => {
    if (!status) return;
    let resolutionNote = '';
    let rejectionReason = '';

    if (status === 'RESOLVED') {
      resolutionNote = window.prompt('Enter resolution note') || '';
    }
    if (status === 'REJECTED') {
      rejectionReason = window.prompt('Enter rejection reason') || '';
    }

    try {
      await axios.put(`${TICKETS_API}/${ticketId}/status`, {
        status,
        resolutionNote,
        rejectionReason
      });
      showToast('Ticket status updated', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to update status', 'error');
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm('Delete this ticket? This action cannot be undone.')) return;
    try {
      await axios.delete(`${TICKETS_API}/${ticketId}`);
      showToast('Ticket deleted successfully', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to delete ticket', 'error');
    }
  };

  const canModifyComment = (comment) => {
    const role = (currentUser?.role || '').toUpperCase();
    return comment.authorEmail === currentUser?.email
      || ['ADMIN', 'STAFF', 'MANAGER', 'TECHNICIAN'].includes(role);
  };

  const addComment = async (ticketId) => {
    const content = window.prompt('Enter comment');
    if (!content) return;
    try {
      await axios.post(`${TICKETS_API}/${ticketId}/comments`, {
        requesterEmail: currentUser?.email,
        requesterName: currentUser?.fullName,
        content
      });
      showToast('Comment added', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to add comment', 'error');
    }
  };

  const editComment = async (ticketId, comment) => {
    const content = window.prompt('Edit comment', comment.content);
    if (!content) return;
    try {
      await axios.put(`${TICKETS_API}/${ticketId}/comments/${comment.id}`, {
        requesterEmail: currentUser?.email,
        requesterRole: currentUser?.role,
        content
      });
      showToast('Comment updated', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to update comment', 'error');
    }
  };

  const removeComment = async (ticketId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${TICKETS_API}/${ticketId}/comments/${commentId}`, {
        data: {
          requesterEmail: currentUser?.email,
          requesterRole: currentUser?.role
        }
      });
      showToast('Comment deleted', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to delete comment', 'error');
    }
  };

  return (
    <div className="manager-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <h1>🧑‍💼 Ticket Manager Console</h1>
      <p className="page-subtitle">Manage ticket workflow and assignments.</p>

      <section className="panel">
        <div className="panel-heading-row">
          <h2>🎫 Manage Tickets</h2>
          <button className="btn-primary" onClick={onNavigateToTechnicians}>Technicians Management</button>
        </div>
        <div className="filters">
          <input
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            placeholder="Search by location, reporter, category, technician..."
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            {ALLOWED_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        {loading ? (
          <p>Loading manager data...</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Email</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Comments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.resourceOrLocation}</td>
                    <td>{ticket.category}</td>
                    <td>
                      <button
                        type="button"
                        className="ticket-subject-btn"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        {ticket.subject || '(No Subject)'}
                      </button>
                    </td>
                    <td>{ticket.priority}</td>
                    <td>{ticket.reportedBy}</td>
                    <td>{ticket.assignedTechnicianId || '-'}</td>
                    <td>{ticket.status}</td>
                    <td className="ticket-notes">{ticket.resolutionNote || ticket.rejectionReason || '-'}</td>
                    <td>
                      <div className="comments-box">
                        {(ticket.comments || []).map((comment) => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-meta">{comment.authorName || comment.authorEmail}</div>
                            <div className="comment-text">{comment.content}</div>
                            {canModifyComment(comment) && (
                              <div className="comment-actions">
                                <button type="button" className="btn-small" onClick={() => editComment(ticket.id, comment)}>Edit</button>
                                <button type="button" className="btn-small danger" onClick={() => removeComment(ticket.id, comment.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button" className="btn-small" onClick={() => addComment(ticket.id)}>+ Add Comment</button>
                      </div>
                    </td>
                    <td className="row-buttons">
                      <select
                        defaultValue=""
                        onChange={(e) => assignTechnician(ticket.id, e.target.value)}
                      >
                        <option value="">Assign Tech</option>
                        {technicians
                          .filter((t) => !busyTechnicianIds.has(t.technicianId) || t.technicianId === ticket.assignedTechnicianId)
                          .map((tech) => (
                            <option key={tech.id} value={tech.technicianId}>
                              {tech.technicianId} - {tech.name} ({(tech.specialization || 'GENERAL_MAINTENANCE').replace(/_/g, ' ')})
                            </option>
                          ))}
                      </select>
                      <select
                        defaultValue=""
                        onChange={(e) => updateStatus(ticket.id, e.target.value)}
                      >
                        <option value="">Update Status</option>
                        {ALLOWED_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="btn-small danger"
                        onClick={() => deleteTicket(ticket.id)}
                      >
                        Delete Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>{selectedTicket.subject || 'Ticket Details'}</h3>
              <button type="button" className="ticket-modal-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>
            <div className="ticket-modal-body">
              <p><strong>Location:</strong> {selectedTicket.resourceOrLocation}</p>
              <p><strong>Category:</strong> {selectedTicket.category}</p>
              <p><strong>Priority:</strong> {selectedTicket.priority}</p>
              <p><strong>Status:</strong> {selectedTicket.status}</p>
              <p><strong>Reporter:</strong> {selectedTicket.reportedBy}</p>
              <p><strong>Technician:</strong> {selectedTicket.assignedTechnicianId || '-'}</p>
              <div className="ticket-modal-attachments">
                <strong>Attachments:</strong>
                {(selectedTicket.attachments || []).length === 0 ? (
                  <span> - </span>
                ) : (
                  <div className="ticket-modal-attachment-list">
                    {(selectedTicket.attachments || []).map((att, index) => (
                      <a
                        key={`${selectedTicket.id}-${index}`}
                        href={att.base64Content}
                        download={att.fileName}
                      >
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="ticket-description-box">{selectedTicket.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketManagerPage;
