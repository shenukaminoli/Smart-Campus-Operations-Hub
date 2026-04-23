import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import axios from 'axios';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/CalendarPage.css';

const localizer = momentLocalizer(moment);
const API = 'http://localhost:8081/api/bookings';

const STATUS_COLORS = {
  PENDING: '#FFB800',
  APPROVED: '#4caf50',
  REJECTED: '#ef5350',
  CANCELLED: '#90a4ae'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2024 + i);

function CalendarPage() {
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('month');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API);
      setBookings(res.data);
      convertToEvents(res.data);
    } catch (err) {
      console.error('Error fetching bookings', err);
    }
    setLoading(false);
  };

  const convertToEvents = (bookings) => {
    const calendarEvents = bookings.map(booking => {
      const startDateTime = moment(
        `${booking.date} ${booking.startTime}`, 'YYYY-MM-DD HH:mm:ss'
      ).toDate();
      const endDateTime = moment(
        `${booking.date} ${booking.endTime}`, 'YYYY-MM-DD HH:mm:ss'
      ).toDate();
      return {
        id: booking.id,
        title: `${booking.resourceName} — ${booking.userId}`,
        start: startDateTime,
        end: endDateTime,
        status: booking.status,
        booking: booking
      };
    });
    setEvents(calendarEvents);
  };

  const handleNavigate = () => {
    const newDate = new Date(selectedYear, selectedMonth, 1);
    setCurrentDate(newDate);
  };

  const handlePrev = () => {
    const newDate = moment(currentDate).subtract(1, view === 'month' ? 'months' : view === 'week' ? 'weeks' : 'days').toDate();
    setCurrentDate(newDate);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const handleNext = () => {
    const newDate = moment(currentDate).add(1, view === 'month' ? 'months' : view === 'week' ? 'weeks' : 'days').toDate();
    setCurrentDate(newDate);
    setSelectedMonth(newDate.getMonth());
    setSelectedYear(newDate.getFullYear());
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const eventStyleGetter = (event) => {
    const color = STATUS_COLORS[event.status] || '#003366';
    return {
      style: {
        backgroundColor: color,
        borderRadius: '6px',
        color: event.status === 'PENDING' ? '#003366' : 'white',
        border: 'none',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: '600'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.booking);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="calendar-loading">
        <div className="spinner"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <h1>📅 Booking Calendar</h1>
      <p className="page-subtitle">View all bookings on an interactive calendar</p>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#FFB800' }}></span>
          <span>Pending</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#4caf50' }}></span>
          <span>Approved</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ef5350' }}></span>
          <span>Rejected</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#90a4ae' }}></span>
          <span>Cancelled</span>
        </div>
      </div>

      {/* Custom Toolbar */}
      <div className="custom-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={handleToday}>Today</button>
          <button className="toolbar-btn" onClick={handlePrev}>◀ Prev</button>
          <button className="toolbar-btn" onClick={handleNext}>Next ▶</button>
        </div>

        <div className="toolbar-center">
          <span className="toolbar-title">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>

        <div className="toolbar-right">
          <select
            className="toolbar-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            className="toolbar-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {YEARS.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="toolbar-btn-gold" onClick={handleNavigate}>
            Go
          </button>
          <div className="view-toggle">
            <button
              className={view === 'month' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setView('month')}>Month</button>
            <button
              className={view === 'week' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setView('week')}>Week</button>
            <button
              className={view === 'day' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setView('day')}>Day</button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          view={view}
          onView={(v) => setView(v)}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          toolbar={false}
          popup
        />
      </div>

      {/* Booking Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Booking Details</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-row">
                <span className="modal-label">Resource</span>
                <span className="modal-value">{selectedEvent.resourceName}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Resource ID</span>
                <span className="modal-value">{selectedEvent.resourceId}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">User ID</span>
                <span className="modal-value">{selectedEvent.userId}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Date</span>
                <span className="modal-value">{selectedEvent.date}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Time</span>
                <span className="modal-value">
                  {selectedEvent.startTime} — {selectedEvent.endTime}
                </span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Purpose</span>
                <span className="modal-value">{selectedEvent.purpose}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Attendees</span>
                <span className="modal-value">{selectedEvent.attendees}</span>
              </div>
              <div className="modal-row">
                <span className="modal-label">Status</span>
                <span className={`status-badge ${getStatusClass(selectedEvent.status)}`}>
                  {selectedEvent.status}
                </span>
              </div>
              {selectedEvent.rejectionReason && (
                <div className="modal-row">
                  <span className="modal-label">Rejection Reason</span>
                  <span className="modal-value rejection">
                    {selectedEvent.rejectionReason}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;