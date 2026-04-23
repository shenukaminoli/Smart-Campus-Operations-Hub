import React, { useEffect, useState, useMemo } from "react";
import { createResource, deleteResource, getResources, updateResource } from "../api/resourceApi";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import "../styles/ResourcePage.css";

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
  const [selectedIds, setSelectedIds] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    minCapacity: "",
    maxCapacity: "",
    location: "",
    status: "",
    sortBy: "name",
  });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.minCapacity) delete params.minCapacity;
      if (!params.maxCapacity) delete params.maxCapacity;
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

  const onDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await deleteResource(id);
      fetchResources();
    } catch {
      setError("Delete failed");
    }
  };

  // Bulk Actions
  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    setError("");
    try {
      const promises = selectedIds.map(id => updateResource(id, { ...resources.find(r => r.id === id), status: newStatus }));
      await Promise.all(promises);
      setSelectedIds([]);
      fetchResources();
    } catch {
      setError("Bulk update failed. Some resources might not have updated.");
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text("Smart Campus - Resources Inventory Report", 14, 20);
    
    // Add Summary Section to PDF
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Assets: ${resources.length} | Active: ${activeCount} | Total Capacity: ${totalCapacity}`, 14, 30);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Prepare Table Data
    const tableColumn = ["Name", "Type", "Capacity", "Location", "Status"];
    const tableRows = resources.map(r => [
      r.name,
      r.type,
      r.capacity,
      r.location,
      r.status
    ]);

    // Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [0, 51, 102] } // Match your #003366 theme
    });

    doc.save("campus_resources_report.pdf");
  };

  const resetFilters = () => {
    setFilters({
      type: "",
      minCapacity: "",
      maxCapacity: "",
      location: "",
      status: "",
      sortBy: "name",
    });
    setKeyword("");
    fetchResources();
  };

  // Interactive Chart Logic
  const handleChartClick = (data, type) => {
    if (data && data.name) {
      setFilters(prev => ({ ...prev, [type]: data.name }));
      // Auto-trigger fetch
      const newFilters = { ...filters, [type]: data.name };
      const params = { ...newFilters };
      if (!params.minCapacity) delete params.minCapacity;
      if (!params.maxCapacity) delete params.maxCapacity;
      getResources(params).then(res => setResources(res.data));
    }
  };

  // Optimized Local filtering for immediate feedback
  const filteredResources = useMemo(() => resources.filter((r) => {
    const q = keyword.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      // Capacity range local logic
      (filters.minCapacity === "" || r.capacity >= Number(filters.minCapacity)) &&
      (filters.maxCapacity === "" || r.capacity <= Number(filters.maxCapacity))
    );
  }), [resources, keyword, filters.minCapacity, filters.maxCapacity]);

  // Optimized Statistics and Chart Data
  const { activeCount, outCount, totalCapacity, activeCapacity, statusData, locationData, typeData, capData } = useMemo(() => {
    const active = resources.filter(r => r.status === 'ACTIVE');
    const out = resources.filter(r => r.status === 'OUT_OF_SERVICE');
    
    const statusMap = {};
    const locationMap = {};
    const typeMap = {};
    const capMap = {};
    const capCount = {};

    resources.forEach(r => {
      statusMap[r.status] = (statusMap[r.status] || 0) + 1;
      locationMap[r.location] = (locationMap[r.location] || 0) + 1;
      typeMap[r.type] = (typeMap[r.type] || 0) + 1;
      capMap[r.type] = (capMap[r.type] || 0) + Number(r.capacity);
      capCount[r.type] = (capCount[r.type] || 0) + 1;
    });

    return {
      activeCount: active.length,
      outCount: out.length,
      totalCapacity: resources.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0),
      activeCapacity: active.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0),
      statusData: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
      locationData: Object.entries(locationMap).map(([name, value]) => ({ name, value })),
      typeData: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
      capData: Object.keys(capMap).map(type => ({
        name: type,
        average: Math.round(capMap[type] / capCount[type])
      }))
    };
  }, [resources]);

  const CHART_COLORS = ['#003366', '#FFB800', '#16a34a', '#dc2626', '#90a4ae', '#607d8b', '#795548'];

  return (
    <div className="resource-page">
      <section className="resource-header">
        <div style={{ flex: 1 }}>
          <h2>Resource Management</h2>
          <p>Admin panel to add, edit or remove campus facilities.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={() => setShowAnalytics(!showAnalytics)}>
            {showAnalytics ? "📊 Hide Analytics" : "📊 Show Analytics"}
          </button>
          <button className="btn-ghost" onClick={exportToPDF}>⬇️ Export PDF</button>
          <button className="btn-admin-toggle" onClick={onNavigate}>
            Back to Catalogue
          </button>
        </div>
      </section>

      <section className="resource-stats">
        <div className="stat-card">
          <p>Total Resources</p>
          <h3>{resources.length}</h3>
          <small>{totalCapacity} Total Seats</small>
        </div>
        <div className="stat-card stat-active">
          <p>Active</p>
          <h3>{activeCount}</h3>
        </div>
        <div className="stat-card stat-out">
          <p>Out of Service</p>
          <h3>{outCount}</h3>
        </div>
        <div className="stat-card" style={{borderTopColor: '#FFB800'}}>
          <p>Operational Capacity</p>
          <h3>{activeCapacity}</h3>
          <small>Seats currently available</small>
        </div>
      </section>

      {showAnalytics && resources.length > 0 && (
        <section className="section-card analytics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ height: '300px' }}>
            <h4 style={{ textAlign: 'center', color: '#003366', marginBottom: '10px' }}>Type Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => handleChartClick(data, 'type')}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: '300px' }}>
            <h4 style={{ textAlign: 'center', color: '#003366', marginBottom: '10px' }}>Avg. Capacity by Type</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capData} onClick={(data) => data && handleChartClick(data.activePayload[0].payload, 'type')}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f4f7fc'}} />
                <Bar 
                  dataKey="average" 
                  fill="#FFB800" 
                  radius={[10, 10, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ height: '300px' }}>
            <h4 style={{ textAlign: 'center', color: '#003366', marginBottom: '10px' }}>Status Distribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => handleChartClick(data, 'status')}
                >
                  {statusData.map((entry, index) => (
                    <Cell 
                      key={`cell-status-${index}`} 
                      fill={entry.name === 'ACTIVE' ? '#16a34a' : '#dc2626'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ height: '300px' }}>
            <h4 style={{ textAlign: 'center', color: '#003366', marginBottom: '10px' }}>Resources by Location</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} onClick={(data) => data && handleChartClick(data.activePayload[0].payload, 'location')}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f4f7fc'}} />
                <Legend />
                <Bar 
                  dataKey="value" 
                  name="Resources"
                  fill="#003366" 
                  radius={[10, 10, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

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
          <input type="number" placeholder="Min Cap" value={filters.minCapacity} onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })} />
          <input type="number" placeholder="Max Cap" value={filters.maxCapacity} onChange={(e) => setFilters({ ...filters, maxCapacity: e.target.value })} />
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