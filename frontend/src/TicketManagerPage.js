import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './TicketManagerPage.css';

const TICKETS_API = 'http://localhost:8081/api/tickets';
const TECHNICIANS_API = 'http://localhost:8081/api/technicians';
const ALLOWED_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];

function TicketManagerPage() {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [techForm, setTechForm] = useState({
    technicianId: '',
    name: '',
    email: '',
    phone: '',
    specialization: '',
    active: true
  });
  const [editingTechId, setEditingTechId] = useState(null);

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
      || ticket.category?.toLowerCase().includes(term)
      || ticket.reportedBy?.toLowerCase().includes(term)
      || ticket.assignedTechnicianId?.toLowerCase().includes(term);
    return statusOk && textOk;
  }), [tickets, ticketSearch, statusFilter]);

  const handleTechFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTechForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetTechForm = () => {
    setTechForm({
      technicianId: '',
      name: '',
      email: '',
      phone: '',
      specialization: '',
      active: true
    });
    setEditingTechId(null);
  };

  const submitTechnician = async (e) => {
    e.preventDefault();
    if (!techForm.email.includes('@')) {
      showToast('Email must include @', 'error');
      return;
    }
    if (!/^\d{10}$/.test(techForm.phone)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return;
    }
    try {
      if (editingTechId) {
        await axios.put(`${TECHNICIANS_API}/${editingTechId}`, techForm);
        showToast('Technician updated', 'success');
      } else {
        await axios.post(TECHNICIANS_API, techForm);
        showToast('Technician added', 'success');
      }
      resetTechForm();
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to save technician', 'error');
    }
  };

  const editTechnician = (tech) => {
    setEditingTechId(tech.id);
    setTechForm({
      technicianId: tech.technicianId,
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialization: tech.specialization,
      active: tech.active
    });
  };

  const deleteTechnician = async (id) => {
    if (!window.confirm('Delete this technician?')) return;
    try {
      await axios.delete(`${TECHNICIANS_API}/${id}`);
      showToast('Technician deleted', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to delete technician', 'error');
    }
  };

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

      <section className="panel">
        <h2>{editingTechId ? '✏️ Edit Technician' : '➕ Add Technician'}</h2>
        <form className="tech-form" onSubmit={submitTechnician}>
          <input name="technicianId" placeholder="Technician ID" value={techForm.technicianId} onChange={handleTechFormChange} required />
          <input name="name" placeholder="Full Name" value={techForm.name} onChange={handleTechFormChange} required />
          <input name="email" type="email" placeholder="Email" value={techForm.email} onChange={handleTechFormChange} required />
          <input
            name="phone"
            placeholder="Phone (10 digits)"
            value={techForm.phone}
            onChange={handleTechFormChange}
            required
            pattern="\d{10}"
            maxLength="10"
            title="Phone number must be exactly 10 digits"
          />
          <input name="specialization" placeholder="Specialization" value={techForm.specialization} onChange={handleTechFormChange} required />
          <label className="checkbox-row">
            <input type="checkbox" name="active" checked={techForm.active} onChange={handleTechFormChange} />
            Active
          </label>
          <div className="actions-row">
            <button type="submit" className="btn-primary">{editingTechId ? 'Update' : 'Add'}</button>
            {editingTechId && <button type="button" className="btn-muted" onClick={resetTechForm}>Cancel</button>}
          </div>
        </form>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tech ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Specialization</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
                <tr key={tech.id}>
                  <td>{tech.technicianId}</td>
                  <td>{tech.name}</td>
                  <td>{tech.email}</td>
                  <td>{tech.phone}</td>
                  <td>{tech.specialization}</td>
                  <td>{tech.active ? 'Active' : 'Inactive'}</td>
                  <td className="row-buttons">
                    <button className="btn-small" onClick={() => editTechnician(tech)}>Edit</button>
                    <button className="btn-small danger" onClick={() => deleteTechnician(tech.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>🎫 Manage Tickets</h2>
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
                  <th>Priority</th>
                  <th>Reporter</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.resourceOrLocation}</td>
                    <td>{ticket.category}</td>
                    <td>{ticket.priority}</td>
                    <td>{ticket.reportedBy}</td>
                    <td>{ticket.assignedTechnicianId || '-'}</td>
                    <td>{ticket.status}</td>
                    <td className="row-buttons">
                      <select
                        defaultValue=""
                        onChange={(e) => assignTechnician(ticket.id, e.target.value)}
                      >
                        <option value="">Assign Tech</option>
                        {technicians
                          .filter((t) => t.active)
                          .map((tech) => (
                            <option key={tech.id} value={tech.technicianId}>
                              {tech.technicianId} - {tech.name}
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
    </div>
  );
}

export default TicketManagerPage;
