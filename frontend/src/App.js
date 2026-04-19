import React, { useState } from 'react';
import './App.css';
import BookingPage from './BookingPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          🏫 Smart Campus
        </div>
        <div className="nav-links">
          <a href="#home" onClick={() => setCurrentPage('home')}>Home</a>
          <a href="#bookings" onClick={() => setCurrentPage('bookings')}>Bookings</a>
          <a href="#resources">Resources</a>
          <a href="#login" className="btn-login">Login</a>
        </div>
      </nav>

      {currentPage === 'home' && (
        <>
          <section className="hero">
            <div className="hero-content">
              <h1>Smart Campus Operations Hub</h1>
              <p>Book rooms, labs, and equipment easily. Manage your campus resources in one place.</p>
              <div className="hero-buttons">
                <button className="btn-primary"
                  onClick={() => setCurrentPage('bookings')}>Make a Booking</button>
                <button className="btn-secondary">View Resources</button>
              </div>
            </div>
          </section>

          <section className="features">
            <h2>What You Can Do</h2>
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
                <div className="card-icon">👤</div>
                <h3>Role Based Access</h3>
                <p>Students book resources while admins manage and approve requests.</p>
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
            <p>© 2026 Smart Campus Operations Hub — SLIIT</p>
          </footer>
        </>
      )}

      {currentPage === 'bookings' && <BookingPage />}
    </div>
  );
}

export default App;