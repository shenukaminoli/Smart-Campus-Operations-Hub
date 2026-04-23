import React, { useEffect, useState, useMemo } from "react";
import { createResource, deleteResource, getResources, updateResource } from "../api/resourceApi";
import "../styles/ResourcePage.css";

function ResourcePage({ onNavigate, onBook }) {
  const [resources, setResources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [copyToast, setCopyToast] = useState("");
  const [qrResource, setQrResource] = useState(null);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('fav-resources') || '[]'));
  const [filters, setFilters] = useState({
    type: "",
    minCapacity: "",
    location: "",
    status: "",
    sortBy: "name",
    onlyAvailable: false,
    hasAC: false,
    hasProjector: false,
    hasWifi: false,
    wheelchairAccessible: false,
  });

  const fetchResources = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { ...filters };
      if (!params.minCapacity) delete params.minCapacity;
      // Note: Backend doesn't support amenity filters yet, so these will be frontend-only for now
      // if (params.hasProjector) params.hasProjector = true; // Example if backend supported it
      // if (params.hasWifi) params.hasWifi = true;
      // if (params.wheelchairAccessible) params.wheelchairAccessible = true;
      const res = await getResources(params);
      setResources(res.data);
    } catch (e) {
      setError("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(); // Initial fetch, and subsequent fetches are triggered by handleFilterSubmit
  }, [filters]); // Re-fetch when filters change

  useEffect(() => {
    localStorage.setItem('fav-resources', JSON.stringify(favorites));
  }, [favorites]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchResources();
  };

  const copyToClipboard = (resource) => {
    const text = `Check out this resource at Smart Campus: ${resource.name} (${resource.type}) at ${resource.location}. Capacity: ${resource.capacity}.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(`Copied ${resource.name} to clipboard!`);
      setTimeout(() => setCopyToast(""), 3000);
    });
  };

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // Logic to check if resource is open based on system clock
  const checkAvailability = (windows) => {
    if (!windows || windows.length === 0) return true; // Assume always available if no windows specified
    const now = new Date();
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours() * 100 + now.getMinutes(); // Format: 1430 for 14:30

    return windows.some(win => {
      const parts = win.toUpperCase().split(" ");
      if (parts[0] !== currentDay) return false;
      const [start, end] = parts[1].split("-").map(t => parseInt(t.replace(":", "")));
      return currentTime >= start && currentTime <= end;
    });
  };

  const findNextAvailableSlot = (windows) => {
    if (!windows || windows.length === 0) return "Always Available";

    const now = new Date();
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

    for (let i = 0; i < 7; i++) { // Check next 7 days
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      const checkDay = days[checkDate.getDay()];
      const checkTime = (i === 0) ? now.getHours() * 100 + now.getMinutes() : 0; // Start from current time today, or 00:00 for future days

      const dayWindows = windows.filter(win => win.toUpperCase().startsWith(checkDay));
      dayWindows.sort((a, b) => {
        const timeA = parseInt(a.split(" ")[1].split("-")[0].replace(":", ""));
        const timeB = parseInt(b.split(" ")[1].split("-")[0].replace(":", ""));
        return timeA - timeB;
      });

      for (const win of dayWindows) {
        const [start, end] = win.split(" ")[1].split("-").map(t => parseInt(t.replace(":", "")));
        if (start >= checkTime) {
          const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : checkDay.substring(0, 3);
          const formattedStart = `${String(Math.floor(start / 100)).padStart(2, '0')}:${String(start % 100).padStart(2, '0')}`;
          const formattedEnd = `${String(Math.floor(end / 100)).padStart(2, '0')}:${String(end % 100).padStart(2, '0')}`;
          return `${dayName} ${formattedStart}-${formattedEnd}`;
        }
      }
    }
    return "No upcoming slots";
  };

  // Local filtering logic for immediate feedback
  const filteredAndSortedResources = useMemo(() => {
    let list = resources.filter((r) => {
    const q = keyword.toLowerCase().trim();
    const matchesKeyword = !q ||
      (r.name || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q);

    // Logic for mock amenities filtering
    const matchesAC = !filters.hasAC || r.capacity > 20; // Example logic for AC
    const matchesProjector = !filters.hasProjector || (r.type === 'LECTURE_HALL' || r.type === 'MEETING_ROOM');
    const matchesWifi = !filters.hasWifi || true; // Assume all have WiFi for now
    const matchesWheelchair = !filters.wheelchairAccessible || (r.location.includes('Ground Floor') || r.capacity > 50); // Example logic

      if (filters.onlyAvailable) {
        const isOpen = checkAvailability(r.availabilityWindows);
        return matchesKeyword && r.status === "ACTIVE" && isOpen && matchesAC && matchesProjector && matchesWifi && matchesWheelchair;
      }
      return matchesKeyword && matchesAC && matchesProjector && matchesWifi && matchesWheelchair;
    });

    // Sort: Favorites first, then by chosen criteria
    list.sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      if (filters.sortBy === "capacity") {
        return a.capacity - b.capacity;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [resources, keyword, favorites, filters]);

  const generateQrUrl = (resource) => {
    const data = encodeURIComponent(`Smart Campus Resource: ${resource.name}\nType: ${resource.type}\nLocation: ${resource.location}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
  };

  // Calculate stats for the dashboard
  const activeCount = resources.filter((r) => r.status === "ACTIVE").length;
  const outCount = resources.filter((r) => r.status === "OUT_OF_SERVICE").length;
  const totalCapacity = resources.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);

  const clearAllFilters = () => {
    setFilters({
      type: "",
      minCapacity: "",
      location: "",
      status: "",
      sortBy: "name",
      onlyAvailable: false,
    });
    setKeyword("");
  };

  return (
    <div className="resource-page">
      {copyToast && (
        <div className="share-toast">{copyToast}</div>
      )}

      {qrResource && (
        <div className="modal-overlay" onClick={() => setQrResource(null)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Resource QR Code</h2>
              <button className="modal-close" onClick={() => setQrResource(null)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '15px', color: '#666' }}>Scan to view <b>{qrResource.name}</b> info on mobile</p>
              <img src={generateQrUrl(qrResource)} alt="QR Code" className="qr-image" />
            </div>
          </div>
        </div>
      )}

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

          <button type="button" className="btn-reset" onClick={clearAllFilters} style={{marginLeft: 'auto'}}>Clear All</button>

          <div className="amenity-toggles">
            <label className={`amenity-pill ${filters.hasAC ? 'active' : ''}`}>
              <input 
                type="checkbox" 
                checked={filters.hasAC} 
                onChange={(e) => setFilters({...filters, hasAC: e.target.checked})} 
              />
              ❄️ Air Conditioned
            </label>
          </div>

          <label className="checkbox-filter">
            <input 
              type="checkbox" 
              checked={filters.onlyAvailable} 
              onChange={(e) => setFilters({...filters, onlyAvailable: e.target.checked})} 
            />
            Available Now
          </label>

          <div className="amenity-toggles">
            <label className={`amenity-pill ${filters.hasProjector ? 'active' : ''}`}>
              <input type="checkbox" checked={filters.hasProjector} onChange={(e) => setFilters({...filters, hasProjector: e.target.checked})} />
              📽️ Projector
            </label>
            <label className={`amenity-pill ${filters.hasWifi ? 'active' : ''}`}>
              <input type="checkbox" checked={filters.hasWifi} onChange={(e) => setFilters({...filters, hasWifi: e.target.checked})} />
              📶 WiFi
            </label>
            <label className={`amenity-pill ${filters.wheelchairAccessible ? 'active' : ''}`}>
              <input type="checkbox" checked={filters.wheelchairAccessible} onChange={(e) => setFilters({...filters, wheelchairAccessible: e.target.checked})} />
              ♿ Accessible
            </label>
          </div>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="resource-grid">
        {loading && <div className="info-box">Loading resources...</div>}
        {!loading && filteredAndSortedResources.length === 0 && (
          <div className="info-box">No resources found matching your search.</div>
        )}
        {!loading && filteredAndSortedResources.map((r) => (
          <div className={`resource-card ${favorites.includes(r.id) ? 'fav-card' : ''}`} key={r.id}>
            <div className="card-header-flex">
              <div className="title-group">
                <span className="type-tag">{r.type}</span>
                <h3>{r.name}</h3>
              </div>
              <div className="utility-actions">
                <button 
                  className={`btn-favorite ${favorites.includes(r.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(r.id)}
                  title="Favorite"
                >
                  {favorites.includes(r.id) ? '★' : '☆'}
                </button>
                <button className="btn-utility" onClick={() => copyToClipboard(r)} title="Copy Info">📋</button>
                <button className="btn-utility" onClick={() => setQrResource(r)} title="View QR">📱</button>
              </div>
            </div>

            <div className="metadata-row">
              <div className="meta-item"><span className="meta-icon">👥</span> {r.capacity} Seats</div>
              <div className="meta-item"><span className="meta-icon">📍</span> {r.location}</div>
            </div>

            <div className="status-container">
              <span className={`status-dot ${r.status === "ACTIVE" ? "active" : "out"}`}></span>
              <span className="status-text">{r.status.replace('_', ' ')}</span> {/* Replaced 'Available 24/7' with dynamic status */}
              {r.status === "ACTIVE" ? (
                <span className={`availability-pill ${checkAvailability(r.availabilityWindows) ? 'open' : 'closed'}`}>
                  {checkAvailability(r.availabilityWindows) ? '● Open Now' : `○ Next: ${findNextAvailableSlot(r.availabilityWindows)}`}
                </span>
              ) : (
                <span className="availability-pill out-of-service">Out of Service</span>
              )}
            </div>

            <div className="amenities">
               {r.type === 'LAB' && <span title="High-end PCs">💻</span>} {/* Changed 🖥️ to 💻 */}
               {r.type === 'LECTURE_HALL' && <span title="Projector Available">📽️</span>}
               {r.capacity > 20 && <span title="AC">❄️</span>} {/* Example logic for AC */}
               <span title="WiFi">📶</span> {/* Assume all have WiFi for now */}
               {r.location.includes('Ground Floor') && <span title="Wheelchair Accessible">♿</span>} {/* Example logic for Accessible */}

            </div>
            
            <button 
              className="btn-primary-action" 
              onClick={() => onBook(r)}
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