import { useState, useEffect } from 'react';
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

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const roleStyle = ROLE_COLORS[currentUser.role] || ROLE_COLORS.STUDENT;
  const isManager = currentUser.role === 'MANAGER';
  const onManagerPage = isManager && (currentPage === 'ticket-manager' || currentPage === 'technician-management');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          🏫 Smart Campus
        </div>
        {!onManagerPage && (
          <div className="nav-links">
            <a href="#home" onClick={() => setCurrentPage('home')}>Home</a>
            <a href="#dashboard" onClick={() => setCurrentPage('dashboard')}>Dashboard</a>
            <a href="#bookings" onClick={() => setCurrentPage('bookings')}>Bookings</a>
            <a href="#incidents" onClick={() => setCurrentPage('incidents')}>Incidents</a>
            <a href="#calendar" onClick={() => setCurrentPage('calendar')}>Calendar</a>
            <a href="#resources" onClick={() => setCurrentPage('resources')}>Resources</a>
          </div>
        )}
        <div className="nav-user">
          <span className="nav-username">{currentUser.fullName}</span>
          <span className="nav-role-badge" style={roleStyle}>{currentUser.role}</span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {currentPage === 'home' && (
        <>
          <section className="hero">
            <div className="hero-content">
              <h1>Smart Campus <span>Operations Hub</span></h1>
              <p>Book rooms, labs, and equipment easily. Manage your campus resources in one place.</p>
              <div className="hero-buttons">
                <button className="btn-primary"
                  onClick={() => setCurrentPage('bookings')}>Make a Booking</button>
                <button className="btn-secondary"
                  onClick={() => setCurrentPage('dashboard')}>View Dashboard</button>
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
            <div className="feature-cards">
              <div className="card">
                <div className="card-icon">📅</div>
                <h3>Book Resources</h3>
                <p>Reserve lecture halls, labs, meeting rooms and equipment with ease.</p>
              </div>
              <div className="card">
                <div className="card-icon">✅</div>
                <h3>Track Approvals</h3>
                <p>Monitor your booking status from Pending to Approved in real time.</p>
              </div>
              <div className="card">
                <div className="card-icon">🚫</div>
                <h3>Conflict Prevention</h3>
                <p>Our system automatically prevents double bookings for the same resource.</p>
              </div>
              <div className="card">
                <div className="card-icon">📊</div>
                <h3>Analytics Dashboard</h3>
                <p>View booking statistics, charts and most popular resources at a glance.</p>
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <h2>How It Works</h2>
            <p className="subtitle">Simple 4 step process to book your resource</p>
            <div className="steps">
              <div className="step">
                <div className="step-number">1</div>
                <h3>Choose Resource</h3>
                <p>Select the room, lab or equipment you need</p>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <h3>Pick Date & Time</h3>
                <p>Select your preferred date and time slot</p>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <h3>Submit Request</h3>
                <p>Submit your booking request with purpose</p>
              </div>
              <div className="step">
                <div className="step-number">4</div>
                <h3>Get Approved</h3>
                <p>Admin reviews and approves your booking</p>
              </div>
            </div>
          </section>

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

          <footer className="footer">
            <p>© 2026 <span>Smart Campus Operations Hub</span> — SLIIT Faculty of Computing</p>
          </footer>
        </>
      )}

      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'bookings' && <BookingPage prefill={bookingPrefill} />}
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
