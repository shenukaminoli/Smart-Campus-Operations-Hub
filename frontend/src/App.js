import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import IncidentPage from './pages/IncidentPage';
import TicketManagerPage from './pages/TicketManagerPage';
import TechnicianManagementPage from './pages/TechnicianManagementPage';
import ResourcePage from './pages/ResourcePage';
import ResourceManagementPage from './pages/ResourceManagementPage';
import LoginPage from './pages/LoginPage';
import { logoutUser } from './api/authApi';

const ROLE_COLORS = {
  ADMIN:      { background: '#fce4ec', color: '#c62828' },
  STAFF:      { background: '#e3f2fd', color: '#1565c0' },
  STUDENT:    { background: '#e8f5e9', color: '#2e7d32' },
  TECHNICIAN: { background: '#fff3e0', color: '#e65100' },
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [currentUser, setCurrentUser] = useState(null);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [copied, setCopied] = useState(null);
  const [resourceQuery, setResourceQuery] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentPage(user?.role === 'MANAGER' ? 'ticket-manager' : 'home');
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentPage('home');
  };

  const handleStartBooking = (resource) => {
    // Keep teammate flow: resource cards can prefill booking form.
    if (resource) {
      setBookingPrefill({
        resourceId: resource.id || resource.resourceId || '',
        resourceName: resource.name || resource.resourceName || '',
      });
    } else {
      setBookingPrefill(null);
    }
    setCurrentPage('bookings');
  };

  const role = (currentUser?.role || '').toUpperCase();
  const displayName = useMemo(() => (
    currentUser?.fullName || currentUser?.name || currentUser?.username || 'there'
  ), [currentUser]);

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      window.prompt('Copy to clipboard:', value);
    }
  };

  const quickActions = useMemo(() => {
    const common = [
      { key: 'book', label: 'Make a booking', icon: '📅', onClick: () => setCurrentPage('bookings') },
      { key: 'resources', label: 'Browse resources', icon: '🏷️', onClick: () => setCurrentPage('resources') },
      { key: 'calendar', label: 'View calendar', icon: '🗓️', onClick: () => setCurrentPage('calendar') },
    ];

    if (role === 'MANAGER') {
      return [
        { key: 'ticket-manager', label: 'Ticket manager', icon: '🧾', onClick: () => setCurrentPage('ticket-manager') },
        ...common,
      ];
    }

    return common;
  }, [role]);

  const resourcesPreview = useMemo(() => ([
    { id: 'LH-101', name: 'Lecture Hall 101', type: 'Lecture Hall', location: 'Malabe', capacity: 120, tags: ['Projector', 'AC'] },
    { id: 'LAB-A', name: 'Computer Lab A', type: 'Lab', location: 'Malabe', capacity: 40, tags: ['PCs', 'High-speed WiFi'] },
    { id: 'MR-3F', name: 'Meeting Room (3rd Floor)', type: 'Meeting Room', location: 'Malabe', capacity: 12, tags: ['Whiteboard', 'TV'] },
    { id: 'AUD-1', name: 'Auditorium', type: 'Auditorium', location: 'Malabe', capacity: 300, tags: ['Stage', 'Sound'] },
    { id: 'LIB-G', name: 'Library Group Study Pods', type: 'Study', location: 'Malabe', capacity: 6, tags: ['Quiet', 'Power'] },
    { id: 'EQUIP-CAM', name: 'DSLR Camera Kit', type: 'Equipment', location: 'Malabe', capacity: 1, tags: ['Tripod', 'Bag'] },
  ]), []);

  const filteredResources = useMemo(() => {
    const q = resourceQuery.trim().toLowerCase();
    if (!q) return resourcesPreview;
    return resourcesPreview.filter((r) => {
      const hay = `${r.id} ${r.name} ${r.type} ${r.location} ${(r.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resourceQuery, resourcesPreview]);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const roleStyle = ROLE_COLORS[currentUser?.role] || ROLE_COLORS.STUDENT;
  const isManager = currentUser?.role === 'MANAGER';

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          🏫 Smart Campus
        </div>
        <div className="nav-links">
          <a href="#home" onClick={() => setCurrentPage('home')}>Home</a>
          <a href="#bookings" onClick={() => setCurrentPage('bookings')}>Bookings</a>
          <a href="#incidents" onClick={() => setCurrentPage('incidents')}>Incidents</a>
          {isManager && (
            <>
              <a href="#ticket-manager" onClick={() => setCurrentPage('ticket-manager')}>Ticket Manager</a>
              <a href="#technicians" onClick={() => setCurrentPage('technician-management')}>Technicians</a>
            </>
          )}
          <a href="#calendar" onClick={() => setCurrentPage('calendar')}>Calendar</a>
          <a href="#resources" onClick={() => setCurrentPage('resources')}>Resources</a>
        </div>
        <div className="nav-user">
          <span className="nav-username">{currentUser.fullName}</span>
          <span className="nav-role-badge" style={roleStyle}>{currentUser.role}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {currentPage === 'home' && (
        <>
          <section className="welcome-bar" aria-label="Welcome and quick actions">
            <div className="welcome-inner">
              <div className="welcome-text">
                <div className="welcome-title">Welcome, <span className="welcome-name">{displayName}</span></div>
                <div className="welcome-subtitle">
                  {role ? `Signed in as ${role}` : 'Quick access to campus services'}
                </div>
              </div>

              <div className="quick-actions" role="navigation" aria-label="Quick actions">
                {quickActions.map((a) => (
                  <button key={a.key} className="quick-action" onClick={a.onClick} type="button">
                    <span className="qa-icon" aria-hidden="true">{a.icon}</span>
                    <span className="qa-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="hero">
            <div className="hero-content">
              <h1>Smart Campus <span>Operations Hub</span></h1>
              <p>Book rooms, labs, and equipment easily. Manage your campus resources in one place.</p>
              <div className="hero-buttons">
                <button className="btn-primary"
                  onClick={() => setCurrentPage('bookings')}>Make a Booking</button>
                <button className="btn-primary"
                  onClick={() => setCurrentPage('resources')}>Browse Resources</button>
              </div>
            </div>
          </section>

          <div className="banner">
            🎓 SLIIT Smart Campus Operations Hub — Manage Resources Efficiently
          </div>

          <section className="features">
            <h2>What You Can Do</h2>
            <p className="subtitle">Everything you need to manage campus resources in one place</p>
            <ul className="benefits" aria-label="Key benefits">
              <li className="benefit">
                <span className="benefit-icon" aria-hidden="true">📅</span>
                <div className="benefit-body">
                  <div className="benefit-title">Book resources in minutes</div>
                  <div className="benefit-text">Reserve lecture halls, labs, meeting rooms, and equipment with a simple flow.</div>
                </div>
              </li>
              <li className="benefit">
                <span className="benefit-icon" aria-hidden="true">✅</span>
                <div className="benefit-body">
                  <div className="benefit-title">Track requests clearly</div>
                  <div className="benefit-text">See your booking status and updates at a glance—no guesswork.</div>
                </div>
              </li>
              <li className="benefit">
                <span className="benefit-icon" aria-hidden="true">🚫</span>
                <div className="benefit-body">
                  <div className="benefit-title">Avoid double-booking</div>
                  <div className="benefit-text">Built-in conflict checks help prevent overlapping reservations.</div>
                </div>
              </li>
              <li className="benefit">
                <span className="benefit-icon" aria-hidden="true">📊</span>
                <div className="benefit-body">
                  <div className="benefit-title">Useful insights</div>
                  <div className="benefit-text">Get quick visibility into usage trends and popular resources.</div>
                </div>
              </li>
            </ul>
          </section>

          <div className="section-divider" role="presentation" />

          <section className="resource-explorer" aria-label="Quick resource explorer">
            <div className="resource-explorer-head">
              <div>
                <h2>Explore resources</h2>
                <p className="subtitle">Scroll through what’s available and jump straight to booking.</p>
              </div>
              <div className="resource-search">
                <input
                  type="text"
                  value={resourceQuery}
                  onChange={(e) => setResourceQuery(e.target.value)}
                  placeholder="Search rooms, labs, equipment..."
                  aria-label="Search resources"
                />
              </div>
            </div>

            <div className="resource-list" role="list" aria-label="Resources">
              {filteredResources.map((r) => (
                <div key={r.id} className="resource-item" role="listitem">
                  <div className="resource-main">
                    <div className="resource-title">
                      <span className="resource-name">{r.name}</span>
                      <span className="resource-id">{r.id}</span>
                    </div>
                    <div className="resource-meta">
                      <span className="pill">{r.type}</span>
                      <span className="pill">📍 {r.location}</span>
                      <span className="pill">👥 {r.capacity}</span>
                    </div>
                    <div className="resource-tags" aria-label="Resource features">
                      {(r.tags || []).slice(0, 3).map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="resource-actions">
                    <button
                      type="button"
                      className="resource-btn primary"
                      onClick={() => setCurrentPage('bookings')}
                    >
                      Book
                    </button>
                    <button
                      type="button"
                      className="resource-btn"
                      onClick={() => {
                        setResourceQuery(r.name);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Highlight
                    </button>
                  </div>
                </div>
              ))}

              {filteredResources.length === 0 && (
                <div className="resource-empty" role="status">
                  No matches. Try a different keyword (e.g., “lab”, “auditorium”, “camera”).
                </div>
              )}
            </div>
          </section>

          <div className="section-divider" role="presentation" />

          <section className="how-it-works">
            <h2>How It Works</h2>
            <p className="subtitle">A simple flow designed to be fast and reliable</p>
            <div className="steps progress-strip" role="list" aria-label="Booking steps">
              <div className="step" role="listitem">
                <div className="step-badge" aria-hidden="true">1</div>
                <div className="step-icon" aria-hidden="true">🔎</div>
                <h3>Choose Resource</h3>
                <p>Find a room, lab, or equipment that fits your needs.</p>
              </div>
              <div className="step" role="listitem">
                <div className="step-badge" aria-hidden="true">2</div>
                <div className="step-icon" aria-hidden="true">⏱️</div>
                <h3>Pick Date & Time</h3>
                <p>Select a time slot—conflicts are checked automatically.</p>
              </div>
              <div className="step" role="listitem">
                <div className="step-badge" aria-hidden="true">3</div>
                <div className="step-icon" aria-hidden="true">📝</div>
                <h3>Submit Request</h3>
                <p>Add purpose and attendees, then submit in one click.</p>
              </div>
              <div className="step" role="listitem">
                <div className="step-badge" aria-hidden="true">4</div>
                <div className="step-icon" aria-hidden="true">🎉</div>
                <h3>Get Approved</h3>
                <p>Track approval and updates right inside the app.</p>
              </div>
            </div>
          </section>

          <div className="section-divider" role="presentation" />

          <section className="stats">
            <div className="stat">
              <h2>50+</h2>
              <p>Resources Available</p>
            </div>
            <div className="stat">
              <h2>200+</h2>
              <p>Bookings Made</p>
            </div>
            <div className="stat">
              <h2>24/7</h2>
              <p>System Available</p>
            </div>
          </section>

          <section className="contact">
            <h2>Get in touch</h2>
            <p className="subtitle">Questions, feedback, or support—here’s how to reach SLIIT.</p>
            <div className="feature-cards">
              <div className="card">
                <div className="card-icon">📞</div>
                <h3>Phone</h3>
                <p className="contact-line">
                  <a href="tel:+94117544801">+94 11 754 4801</a>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyToClipboard('+94117544801', 'phone')}
                    aria-label="Copy phone number"
                  >
                    {copied === 'phone' ? 'Copied' : 'Copy'}
                  </button>
                </p>
              </div>
              <div className="card">
                <div className="card-icon">✉️</div>
                <h3>Email</h3>
                <p className="contact-line">
                  <a href="mailto:info@sliit.lk">info@sliit.lk</a>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => copyToClipboard('info@sliit.lk', 'email')}
                    aria-label="Copy email address"
                  >
                    {copied === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </p>
              </div>
              <div className="card">
                <div className="card-icon">📍</div>
                <h3>Location</h3>
                <p>
                  SLIIT Malabe Campus,<br />
                  New Kandy Road,<br />
                  Malabe.
                </p>
              </div>
            </div>
          </section>

          <footer className="footer">
            <p>© 2026 <span>Smart Campus Operations Hub</span> — SLIIT Faculty of Computing</p>
          </footer>
        </>
      )}

      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'bookings' && (
        <BookingPage
          currentUser={currentUser}
          prefill={bookingPrefill}
          onOpenAdminDashboard={() => setCurrentPage('dashboard')}
        />
      )}
      {currentPage === 'incidents' && <IncidentPage currentUser={currentUser} />}
      {currentPage === 'ticket-manager' && isManager && (
        <TicketManagerPage
          currentUser={currentUser}
          onNavigateToTechnicians={() => setCurrentPage('technician-management')}
        />
      )}
      {currentPage === 'technician-management' && isManager && (
        <TechnicianManagementPage onBack={() => setCurrentPage('ticket-manager')} />
      )}
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'resources' && <ResourcePage
        onNavigate={() => setCurrentPage('resource-management')}
        onBook={handleStartBooking}
      />}
      {currentPage === 'resource-management' && <ResourceManagementPage onNavigate={() => setCurrentPage('resources')} />}
    </div>
  );
}

export default App;
