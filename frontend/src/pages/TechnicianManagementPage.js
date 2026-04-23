import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/TechnicianManagementPage.css';

const TECHNICIANS_API = 'http://localhost:8081/api/technicians';
const TICKETS_API = 'http://localhost:8081/api/tickets';

function TechnicianManagementPage({ onBack }) {
  const [technicians, setTechnicians] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    technicianId: '',
    name: '',
    email: '',
    phone: '',
    specialization: 'GENERAL_MAINTENANCE'
  });

  const SPECIALIZATIONS = [
    'ELECTRICAL',
    'NETWORK',
    'HVAC',
    'PLUMBING',
    'IT_SUPPORT',
    'SECURITY',
    'GENERAL_MAINTENANCE'
  ];

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [techRes, ticketRes] = await Promise.all([
        axios.get(TECHNICIANS_API),
        axios.get(TICKETS_API)
      ]);
      setTechnicians(techRes.data || []);
      setTickets(ticketRes.data || []);
    } catch (error) {
      showToast('Unable to load technicians', 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const busyTechnicianIds = useMemo(() => new Set(
    tickets
      .filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status))
      .map((ticket) => ticket.assignedTechnicianId)
      .filter(Boolean)
  ), [tickets]);

  const filteredTechnicians = useMemo(() => technicians.filter((tech) => {
    const specializationOk = specializationFilter === 'ALL' || tech.specialization === specializationFilter;
    const term = search.trim().toLowerCase();
    const searchOk = !term
      || tech.technicianId?.toLowerCase().includes(term)
      || tech.name?.toLowerCase().includes(term)
      || tech.email?.toLowerCase().includes(term);
    return specializationOk && searchOk;
  }), [technicians, specializationFilter, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      technicianId: '',
      name: '',
      email: '',
      phone: '',
      specialization: 'GENERAL_MAINTENANCE'
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.includes('@')) {
      showToast('Email must include @', 'error');
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      showToast('Phone number must be exactly 10 digits', 'error');
      return;
    }

    const payload = { ...form, available: true };
    try {
      if (editingId) {
        await axios.put(`${TECHNICIANS_API}/${editingId}`, payload);
        showToast('Technician updated', 'success');
      } else {
        await axios.post(TECHNICIANS_API, payload);
        showToast('Technician added', 'success');
      }
      resetForm();
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to save technician', 'error');
    }
  };

  const edit = (tech) => {
    setEditingId(tech.id);
    setForm({
      technicianId: tech.technicianId || '',
      name: tech.name || '',
      email: tech.email || '',
      phone: tech.phone || '',
      specialization: tech.specialization || 'GENERAL_MAINTENANCE'
    });
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this technician?')) return;
    try {
      await axios.delete(`${TECHNICIANS_API}/${id}`);
      showToast('Technician deleted', 'success');
      fetchAll();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to delete technician', 'error');
    }
  };

  return (
    <div className="technician-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="technician-header">
        <h1>🧰 Technicians Management</h1>
        <button className="btn-primary" onClick={onBack}>Back to Ticket Manager</button>
      </div>
      <p className="page-subtitle">Add, edit and manage technicians. Availability is auto-updated from ticket assignments.</p>

      <section className="panel">
        <h2>{editingId ? 'Edit Technician' : 'Add Technician'}</h2>
        <form className="tech-form" onSubmit={submit}>
          <input name="technicianId" value={form.technicianId} onChange={handleChange} placeholder="Technician ID" required />
          <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" required />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" required />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Phone (10 digits)"
            required
            maxLength="10"
            inputMode="numeric"
            pattern="[0-9]{10}"
          />
          <select name="specialization" value={form.specialization} onChange={handleChange} required>
            {SPECIALIZATIONS.map((specialization) => (
              <option key={specialization} value={specialization}>{specialization.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="actions-row">
            <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" className="btn-muted" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Technician List</h2>
        <div className="filters">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tech ID, name, email..."
          />
          <select value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}>
            <option value="ALL">All Specializations</option>
            {SPECIALIZATIONS.map((specialization) => (
              <option key={specialization} value={specialization}>{specialization.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Loading technicians...</p>
        ) : (
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
                {filteredTechnicians.map((tech) => {
                  const isBusy = busyTechnicianIds.has(tech.technicianId);
                  return (
                    <tr key={tech.id}>
                      <td>{tech.technicianId}</td>
                      <td>{tech.name}</td>
                      <td>{tech.email}</td>
                      <td>{tech.phone}</td>
                      <td>{tech.specialization?.replace(/_/g, ' ')}</td>
                      <td>
                        <span className={`status-pill ${isBusy ? 'status-busy' : 'status-free'}`}>
                          {isBusy ? 'Not Available' : 'Available'}
                        </span>
                      </td>
                      <td className="row-buttons">
                        <button className="btn-small" onClick={() => edit(tech)}>Edit</button>
                        <button className="btn-small danger" onClick={() => remove(tech.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TechnicianManagementPage;
