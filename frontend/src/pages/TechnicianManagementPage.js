import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../styles/TechnicianManagementPage.css';

const TECHNICIANS_API = 'http://localhost:8081/api/technicians';
const TICKETS_API = 'http://localhost:8081/api/tickets';
const SPECIALIZATIONS = [
  { value: 'ALL', label: 'All Specializations' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'NETWORK', label: 'Network' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'IT_SUPPORT', label: 'IT Support' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'GENERAL_MAINTENANCE', label: 'General Maintenance' }
];

function TechnicianManagementPage({ onBackToManager }) {
  const [technicians, setTechnicians] = useState([]);
  const [toast, setToast] = useState(null);
  const [specializationFilter, setSpecializationFilter] = useState('ALL');
  const [techForm, setTechForm] = useState({
    technicianId: '',
    name: '',
    email: '',
    phone: '',
    specialization: 'GENERAL_MAINTENANCE',
    available: true
  });
  const [editingTechId, setEditingTechId] = useState(null);
  const [assignedTechnicianIds, setAssignedTechnicianIds] = useState(new Set());

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTechnicians = async () => {
    try {
      const [techRes, ticketRes] = await Promise.all([
        axios.get(TECHNICIANS_API),
        axios.get(TICKETS_API)
      ]);
      setTechnicians(techRes.data);
      const assignedIds = new Set(
        (ticketRes.data || [])
          .filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status))
          .map((ticket) => ticket.assignedTechnicianId)
          .filter(Boolean)
      );
      setAssignedTechnicianIds(assignedIds);
    } catch (error) {
      showToast('Unable to load technicians', 'error');
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const filteredTechnicians = useMemo(() => {
    if (specializationFilter === 'ALL') {
      return technicians;
    }
    return technicians.filter((tech) => tech.specialization === specializationFilter);
  }, [technicians, specializationFilter]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTechForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setTechForm({
      technicianId: '',
      name: '',
      email: '',
      phone: '',
      specialization: 'GENERAL_MAINTENANCE',
      available: true
    });
    setEditingTechId(null);
  };

  const handleSubmit = async (e) => {
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
      resetForm();
      fetchTechnicians();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to save technician', 'error');
    }
  };

  const handleEdit = (tech) => {
    setEditingTechId(tech.id);
    setTechForm({
      technicianId: tech.technicianId,
      name: tech.name,
      email: tech.email,
      phone: tech.phone,
      specialization: tech.specialization,
      available: tech.available ?? tech.active ?? true
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this technician?')) return;
    try {
      await axios.delete(`${TECHNICIANS_API}/${id}`);
      showToast('Technician deleted', 'success');
      fetchTechnicians();
    } catch (error) {
      showToast(error.response?.data?.error || 'Unable to delete technician', 'error');
    }
  };

  return (
    <div className="technician-page">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <h1>🧑‍🔧 Technician Management</h1>
      <p className="page-subtitle">Add, edit, delete, and filter technicians by specialization.</p>

      <div className="top-actions">
        <button className="btn-primary" onClick={onBackToManager}>← Back to Ticket Manager</button>
      </div>

      <section className="panel">
        <h2>{editingTechId ? '✏️ Edit Technician' : '➕ Add Technician'}</h2>
        <form className="tech-form" onSubmit={handleSubmit}>
          <input name="technicianId" placeholder="Technician ID" value={techForm.technicianId} onChange={handleChange} required />
          <input name="name" placeholder="Full Name" value={techForm.name} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" value={techForm.email} onChange={handleChange} required />
          <input name="phone" placeholder="Phone (10 digits)" value={techForm.phone} onChange={handleChange} required pattern="\d{10}" maxLength="10" />
          <select name="specialization" value={techForm.specialization} onChange={handleChange} required>
            {SPECIALIZATIONS.filter((s) => s.value !== 'ALL').map((specialization) => (
              <option key={specialization.value} value={specialization.value}>{specialization.label}</option>
            ))}
          </select>
          <label className="checkbox-row">
            <input type="checkbox" name="available" checked={techForm.available} onChange={handleChange} />
            Available
          </label>
          <div className="actions-row">
            <button type="submit" className="btn-primary">{editingTechId ? 'Update' : 'Add'}</button>
            {editingTechId && <button type="button" className="btn-muted" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>📋 Technician Directory</h2>
        <div className="filters">
          <select value={specializationFilter} onChange={(e) => setSpecializationFilter(e.target.value)}>
            {SPECIALIZATIONS.map((specialization) => (
              <option key={specialization.value} value={specialization.value}>{specialization.label}</option>
            ))}
          </select>
        </div>
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
              {filteredTechnicians.map((tech) => (
                <tr key={tech.id}>
                  <td>{tech.technicianId}</td>
                  <td>{tech.name}</td>
                  <td>{tech.email}</td>
                  <td>{tech.phone}</td>
                  <td>{tech.specialization.replace(/_/g, ' ')}</td>
                  <td>{assignedTechnicianIds.has(tech.technicianId) ? 'Not Available' : 'Available'}</td>
                  <td className="row-buttons">
                    <button className="btn-small" onClick={() => handleEdit(tech)}>Edit</button>
                    <button className="btn-small danger" onClick={() => handleDelete(tech.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default TechnicianManagementPage;
