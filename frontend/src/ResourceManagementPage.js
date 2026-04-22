import React, { useEffect, useState } from "react";
import { createResource, deleteResource, getResources, updateResource } from "./resourceApi";
import "./ResourcePage.css";

const initialForm = {
  name: "",
  type: "LAB",
  capacity: 1,
  location: "",
  status: "ACTIVE",
  availabilityWindows: ""
};

function ResourceManagementPage({ onNavigate }) {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minCapacity: "",
    location: "",
    status: "",
    sortBy: "name",
  });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.minCapacity) delete params.minCapacity;
      const res = await getResources(params);
      setResources(res.data);
    } catch (e) {
      setError("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      availabilityWindows: form.availabilityWindows
        ? form.availabilityWindows.split(",").map((x) => x.trim()).filter(Boolean)
        : []
    };
    try {
      if (editId) {
        await updateResource(editId, payload);
      } else {
        await createResource(payload);
      }
      setForm(initialForm);
      setEditId(null);
      fetchResources();
    } catch (err) {
      console.error("Save Error:", err);
      let msg = "Save failed: ";
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.message) {
          msg += data.message;
        } else if (typeof data === 'object') {
          msg += Object.entries(data).map(([field, error]) => `${field}: ${error}`).join(", ");
        } else {
          msg += data.toString();
        }
      } else {
        msg += "Check backend connection.";
      }
      setError(msg);
    }
  };

  const onEdit = (r) => {
    setEditId(r.id);
    setForm({
      name: r.name || "",
      type: r.type || "LAB",
      capacity: r.capacity || 1,
      location: r.location || "",
      status: r.status || "ACTIVE",
      availabilityWindows: (r.availabilityWindows || []).join(", ")
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this resource?")) return;
    try {
      await deleteResource(id);
      fetchResources();
    } catch {
      setError("Delete failed");
    }
  };

  const resetFilters = () => {
    setFilters({
      type: "",
      minCapacity: "",
      location: "",
      status: "",
      sortBy: "name",
    });
    setKeyword("");
    fetchResources();
  };

  // Local filtering for immediate feedback
  const filteredResources = resources.filter((r) => {
    const q = keyword.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q)
    );
  });

  // Statistics
  const activeCount = resources.filter(r => r.status === 'ACTIVE').length;
  const outCount = resources.filter(r => r.status === 'OUT_OF_SERVICE').length;

  return (
    <div className="resource-page">
      <section className="resource-header">
        <div>
          <h2>Resource Management</h2>
          <p>Admin panel to add, edit or remove campus facilities.</p>
        </div>
        <button className="btn-admin-toggle" onClick={onNavigate}>
          Back to Catalogue
        </button>
      </section>

      <section className="resource-stats">
        <div className="stat-card">
          <p>Total Resources</p>
          <h3>{resources.length}</h3>
        </div>
        <div className="stat-card stat-active">
          <p>Active</p>
          <h3>{activeCount}</h3>
        </div>
        <div className="stat-card stat-out">
          <p>Out of Service</p>
          <h3>{outCount}</h3>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="section-card">
        <div className="section-title">
          <h3>{editId ? "✏️ Edit Resource" : "➕ Add New Resource"}</h3>
          {editId && <button className="btn-ghost" onClick={() => {setEditId(null); setForm(initialForm);}}>Cancel</button>}
        </div>
        <form className="resource-form" onSubmit={handleSubmit}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="LECTURE_HALL">LECTURE_HALL</option>
            <option value="LAB">LAB</option>
            <option value="MEETING_ROOM">MEETING_ROOM</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </select>
          <input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
          </select>
          <input placeholder="Availability (comma separated)" value={form.availabilityWindows} onChange={(e) => setForm({ ...form, availabilityWindows: e.target.value })} />
          <button type="submit" className="btn-primary-action">{editId ? "Update" : "Add Resource"}</button>
        </form>
      </section>

      <section className="section-card">
        <div className="section-title">
          <h3>🔍 Filter & Sort</h3>
          <button className="btn-ghost" onClick={resetFilters}>Reset Filters</button>
        </div>
        <form className="filters" onSubmit={(e) => { e.preventDefault(); fetchResources(); }}>
          <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All Types</option>
            <option value="LECTURE_HALL">LECTURE_HALL</option>
            <option value="LAB">LAB</option>
            <option value="MEETING_ROOM">MEETING_ROOM</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </select>
          <input placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
          </select>
          <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
            <option value="name">Sort by Name</option>
            <option value="capacity">Sort by Capacity</option>
          </select>
          <button type="submit" className="btn-primary-action">Apply</button>
        </form>
        <div style={{ marginTop: '16px' }}>
          <input 
            className="keyword-search" 
            style={{ marginTop: 0 }}
            placeholder="Live search by name, type, or location in current results..." 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </section>

      <div className="resource-grid">
        {loading && <div className="info-box">Loading...</div>}
        {!loading && filteredResources.length === 0 && <div className="info-box">No resources found matching search.</div>}
        {!loading && filteredResources.map((r) => (
          <div className="resource-card" key={r.id}>
            <h3>{r.name}</h3>
            <p><b>Type:</b> {r.type} | <b>Cap:</b> {r.capacity}</p>
            <p><b>Loc:</b> {r.location}</p>
            <p>
              <b>Status:</b>{" "}
              <span className={r.status === "ACTIVE" ? "status-active" : "status-out"}>
                {r.status}
              </span>
            </p>
            <div className="actions">
              <button onClick={() => onEdit(r)}>Edit</button>
              <button className="danger" onClick={() => onDelete(r.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourceManagementPage;