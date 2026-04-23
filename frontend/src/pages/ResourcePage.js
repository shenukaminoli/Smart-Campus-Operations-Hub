import React, { useEffect, useState } from "react";
import { createResource, deleteResource, getResources, updateResource } from "../api/resourceApi";
import "../styles/ResourcePage.css";

function ResourcePage({ onNavigate, onBook }) {
  const [resources, setResources] = useState([]);
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
    setError("");
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

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchResources();
  };

  // Local filtering logic for immediate feedback
  const filteredByKeyword = resources.filter((r) => {
    const q = keyword.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.name || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q)
    );
  });

  // Calculate stats for the dashboard
  const activeCount = resources.filter((r) => r.status === "ACTIVE").length;
  const totalCapacity = resources.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  return (
    <div className="resource-page">
      <section className="resource-header">
        <div>
          <h2>Campus Resource Catalogue</h2>
          <p>Browse available lecture halls, labs, and equipment slots.</p>
        </div>
        <button className="btn-admin-toggle" onClick={onNavigate}>
          Manage Resources (Admin)
        </button>
      </section>

      <section className="resource-stats">
        <div className="stat-card">
          <p>Total Assets</p>
          <h3>{resources.length}</h3>
        </div>
        <div className="stat-card stat-active">
          <p>Currently Available</p>
          <h3>{activeCount}</h3>
        </div>
        <div className="stat-card">
          <p>Total Capacity</p>
          <h3>{totalCapacity}</h3>
        </div>
      </section>

      <section className="section-card search-only">
        <div className="section-title"><h3>🔍 Filter & Search</h3></div>
        <form className="filters" onSubmit={handleFilterSubmit}>
          <select 
            value={filters.type} 
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="LECTURE_HALL">LECTURE_HALL</option>
            <option value="LAB">LAB</option>
            <option value="MEETING_ROOM">MEETING_ROOM</option>
            <option value="EQUIPMENT">EQUIPMENT</option>
          </select>

          <input 
            placeholder="Location" 
            value={filters.location} 
            onChange={(e) => setFilters({ ...filters, location: e.target.value })} 
          />

          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
          </select>

          <select 
            value={filters.sortBy} 
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="name">Sort by Name</option>
            <option value="capacity">Sort by Capacity</option>
          </select>

          <button type="submit" className="btn-primary-action">Apply Filters</button>
        </form>

        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          <input
            className="keyword-search"
            style={{ marginTop: 0 }}
            placeholder="Quick search by keywords in current results..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="resource-grid">
        {loading && <div className="info-box">Loading resources...</div>}
        {!loading && filteredByKeyword.length === 0 && (
          <div className="info-box">No resources found matching your search.</div>
        )}
        {!loading && filteredByKeyword.map((r) => (
          <div className="resource-card" key={r.id}>
            <h3>{r.name}</h3>
            <p><b>Type:</b> {r.type}</p>
            <p><b>Capacity:</b> {r.capacity}</p>
            <p><b>Location:</b> {r.location}</p>
            <p>
              <b>Status:</b>{" "}
              <span className={r.status === "ACTIVE" ? "status-active" : "status-out"}>
                {r.status}
              </span>
            </p>
            <div className="amenities">
               {/* Example static amenities - these can be made dynamic if the backend is updated */}
               {r.type === 'LAB' && <span title="High-end PCs">🖥️</span>}
               {r.type === 'LECTURE_HALL' && <span title="Projector Available">📽️</span>}
               {r.capacity > 20 && <span title="Air Conditioned">❄️</span>}
               <span title="Free WiFi">📶</span>
            </div>
            <p className="availability"><b>Hours:</b> {(r.availabilityWindows || []).join(" | ") || "24/7"}</p>
            <button 
              className="btn-primary-action" 
              style={{ width: '100%', marginTop: '15px', fontSize: '14px', padding: '10px' }}
              onClick={onBook}
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourcePage;