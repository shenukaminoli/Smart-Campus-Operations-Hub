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

function ResourcePage() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minCapacity: "",
    location: "",
    status: "",
    sortBy: "name"
  });

  const fetchResources = async () => {
    try {
      const params = { ...filters };
      if (!params.minCapacity) delete params.minCapacity;
      const res = await getResources(params);
      setResources(res.data);
    } catch (e) {
      setError("Failed to load resources");
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
        // If the backend returns a Map of validation errors (standard Spring Boot behavior)
        const data = err.response.data;
        if (data.message) {
          msg += data.message;
        } else if (typeof data === 'object') {
          msg += Object.entries(data).map(([field, error]) => `${field}: ${error}`).join(", ");
        } else {
          msg += data.toString();
        }
      } else {
        msg += "Could not connect to the backend server. Is it running on port 8081?";
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

  const applyFilters = (e) => {
    e.preventDefault();
    fetchResources();
  };

  return (
    <div className="resource-page">
      <h2>Facilities & Assets Catalogue</h2>
      {error && <p className="error">{error}</p>}
      <form className="resource-form" onSubmit={handleSubmit}>
        <input
          placeholder="Resource Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="LECTURE_HALL">LECTURE_HALL</option>
          <option value="LAB">LAB</option>
          <option value="MEETING_ROOM">MEETING_ROOM</option>
          <option value="EQUIPMENT">EQUIPMENT</option>
        </select>
        <input
          type="number"
          min="1"
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          required
        />
        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          required
        />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
        </select>
        <input
          placeholder="Availability windows (comma separated)"
          value={form.availabilityWindows}
          onChange={(e) => setForm({ ...form, availabilityWindows: e.target.value })}
        />
        <button type="submit">{editId ? "Update Resource" : "Add Resource"}</button>
      </form>
      <form className="filters" onSubmit={applyFilters}>
        <input
          placeholder="Type"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        />
        <input
          type="number"
          min="1"
          placeholder="Min Capacity"
          value={filters.minCapacity}
          onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })}
        />
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
        <button type="submit">Apply Filters</button>
      </form>
      <div className="resource-grid">
        {resources.map((r) => (
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

export default ResourcePage;