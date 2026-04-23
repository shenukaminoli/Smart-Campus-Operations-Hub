import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/TicketManagerPage.css';

const TICKETS_API = 'http://localhost:8081/api/tickets';
const TECHNICIANS_API = 'http://localhost:8081/api/technicians';
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];
const SPECIALIZATIONS = ['ALL', 'ELECTRICAL', 'NETWORK', 'HVAC', 'PLUMBING', 'IT_SUPPORT', 'SECURITY', 'GENERAL_MAINTENANCE'];

function TicketManagerPage({ onNavigateToTechnicians }) {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const busyTechnicianIds = useMemo(() => new Set(
    tickets
      .filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status))
      .map((ticket) => ticket.assignedTechnicianId)
      .filter(Boolean)
  ), [tickets]);

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

  const ticketStats = useMemo(() => ({
    ALL: tickets.length,
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
    REJECTED: tickets.filter((t) => t.status === 'REJECTED').length
  }), [tickets]);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const term = ticketSearch.toLowerCase();
    const statusOk = statusFilter === 'ALL' || ticket.status === statusFilter;
    const specializationOk = specializationFilter === 'ALL'
      || ticket.preferredSpecialization === specializationFilter;
    const textOk = !term
      || ticket.resourceOrLocation?.toLowerCase().includes(term)
      || ticket.category?.toLowerCase().includes(term)
      || ticket.preferredSpecialization?.toLowerCase().includes(term)
      || ticket.reportedBy?.toLowerCase().includes(term)
      || ticket.assignedTechnicianId?.toLowerCase().includes(term);
    return statusOk && specializationOk && textOk;
  }), [tickets, ticketSearch, statusFilter, specializationFilter]);

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

  return (
    <div className="manager-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <h1>🧑‍💼 Ticket Manager Console</h1>
      <p className="page-subtitle">Manage technicians and incident workflow from one page.</p>
      <div className="manager-top-actions">
        <button className="btn-primary" onClick={onNavigateToTechnicians}>Technicians Management</button>
      </div>

      <section className="panel">
        <h2>🎫 Manage Tickets</h2>
        <div className="status-tiles">
          <button
            className={`status-tile tile-all ${statusFilter === 'ALL' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <span>All</span>
            <strong>{ticketStats.ALL}</strong>
          </button>
          <button
            className={`status-tile tile-open ${statusFilter === 'OPEN' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('OPEN')}
          >
            <span>Open</span>
            <strong>{ticketStats.OPEN}</strong>
          </button>
          <button
            className={`status-tile tile-progress ${statusFilter === 'IN_PROGRESS' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            <span>In Progress</span>
            <strong>{ticketStats.IN_PROGRESS}</strong>
          </button>
          <button
            className={`status-tile tile-resolved ${statusFilter === 'RESOLVED' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            <span>Resolved</span>
            <strong>{ticketStats.RESOLVED}</strong>
          </button>
          <button
            className={`status-tile tile-closed ${statusFilter === 'CLOSED' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('CLOSED')}
          >
            <span>Closed</span>
            <strong>{ticketStats.CLOSED}</strong>
          </button>
          <button
            className={`status-tile tile-rejected ${statusFilter === 'REJECTED' ? 'status-tile-active' : ''}`}
            onClick={() => setStatusFilter('REJECTED')}
          >
            <span>Rejected</span>
            <strong>{ticketStats.REJECTED}</strong>
          </button>
        </div>
        <div className="filters">
          <input
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            placeholder="Search by location, reporter, category, specialization, technician..."
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            {ALLOWED_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}>
            {SPECIALIZATIONS.map((specialization) => (
              <option key={specialization} value={specialization}>
                {specialization === 'ALL' ? 'All Specializations' : specialization.replace(/_/g, ' ')}
              </option>
            ))}
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
                  <th>Reporter</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Attachments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.resourceOrLocation}</td>
                    <td>{ticket.category?.replace(/_/g, ' ')}</td>
                    <td>
                      <button
                        className="ticket-subject-btn"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        {ticket.subject || '(No subject)'}
                      </button>
                    </td>
                    <td>{ticket.priority}</td>
                    <td>{ticket.reportedBy}</td>
                    <td>{ticket.assignedTechnicianId || '-'}</td>
                    <td>{ticket.status}</td>
                    <td>
                      <div className="ticket-attachments">
                        {(ticket.attachments || []).map((attachment, index) => (
                          <a
                            key={`${ticket.id}-attachment-${index}`}
                            href={attachment.base64Content}
                            download={attachment.fileName}
                            title={attachment.fileName}
                          >
                            {attachment.fileName}
                          </a>
                        ))}
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
                          .filter((t) => !ticket.preferredSpecialization || t.specialization === ticket.preferredSpecialization)
                          .map((tech) => (
                            <option key={tech.id} value={tech.technicianId}>
                              {tech.technicianId} - {tech.name} ({tech.specialization.replace(/_/g, ' ')})
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
              <button className="ticket-modal-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>
            <div className="ticket-modal-body">
              <p><strong>Location:</strong> {selectedTicket.resourceOrLocation}</p>
              <p><strong>Category:</strong> {selectedTicket.category?.replace(/_/g, ' ')}</p>
              <p><strong>Specialization:</strong> {selectedTicket.preferredSpecialization?.replace(/_/g, ' ') || '-'}</p>
              <p><strong>Priority:</strong> {selectedTicket.priority}</p>
              <p><strong>Reporter:</strong> {selectedTicket.reportedBy}</p>
              <p><strong>Status:</strong> {selectedTicket.status}</p>
              <p><strong>Description:</strong></p>
              <div className="ticket-description-box">{selectedTicket.description}</div>
              <p><strong>Notes:</strong> {selectedTicket.resolutionNote || selectedTicket.rejectionReason || '-'}</p>
              <p><strong>Attachments:</strong></p>
              <div className="ticket-attachments">
                {(selectedTicket.attachments || []).map((attachment, index) => (
                  <a
                    key={`${selectedTicket.id}-modal-attachment-${index}`}
                    href={attachment.base64Content}
                    download={attachment.fileName}
                  >
                    {attachment.fileName}
                  </a>
                ))}
                {(selectedTicket.attachments || []).length === 0 && <span>No attachments</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketManagerPage;
