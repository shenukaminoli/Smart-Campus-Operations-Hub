import React, { useEffect, useState } from "react";
import { createResource, deleteResource, getResources, updateResource } from "./resourceApi";
import "./ResourcePage.css";

function ResourcePage({ onNavigate }) {
  const [resources, setResources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const fetchResources = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getResources();
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
        <div className="section-title">
          <h3>🔍 Search Resources</h3>
        </div>
        <input
          className="keyword-search"
          placeholder="Search by name, type, or location..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
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
            <p><b>Availability:</b> {(r.availabilityWindows || []).join(" | ") || "N/A"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResourcePage;