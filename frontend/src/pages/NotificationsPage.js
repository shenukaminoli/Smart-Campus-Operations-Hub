import { useState, useEffect } from 'react';
import {
  getNotifications, markAsRead, markAllAsRead,
  deleteNotification, clearAllNotifications,
} from '../api/notificationApi';
import '../styles/NotificationsPage.css';

const TYPE_ICONS = {
  BOOKING_APPROVED:        '✅',
  BOOKING_REJECTED:        '❌',
  BOOKING_CANCELLED:       '🚫',
  BOOKING_CREATED:         '📅',
  INCIDENT_STATUS_CHANGED: '🔧',
  INCIDENT_ASSIGNED:       '👷',
  INCIDENT_COMMENT:        '💬',
  ROLE_CHANGED:            '👤',
};

const FILTERS = ['All', 'Unread', 'Booking', 'Incident'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m} minute${m !== 1 ? 's' : ''} ago`;
  if (h < 24)  return `${h} hour${h !== 1 ? 's' : ''} ago`;
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    getNotifications()
      .then(res => setNotifications(res.data))
      .catch(() => setToast({ message: 'Failed to load notifications', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === 'All')      return true;
    if (filter === 'Unread')   return !n.read;
    if (filter === 'Booking')  return n.referenceType === 'BOOKING';
    if (filter === 'Incident') return n.referenceType === 'INCIDENT';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {
      setToast({ message: 'Failed to mark as read', type: 'error' });
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setToast({ message: 'All notifications marked as read', type: 'success' });
    } catch {
      setToast({ message: 'Failed to mark all as read', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {
      setToast({ message: 'Failed to delete notification', type: 'error' });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setToast({ message: 'All notifications cleared', type: 'success' });
    } catch {
      setToast({ message: 'Failed to clear notifications', type: 'error' });
    }
  };

  return (
    <div className="np-page">
      {toast && <div className={`np-toast np-toast-${toast.type}`}>{toast.message}</div>}

      <div className="np-header">
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        <div className="np-header-actions">
          {unreadCount > 0 && (
            <button className="np-btn np-btn-secondary" onClick={handleMarkAll}>✓ Mark all as read</button>
          )}
          {notifications.length > 0 && (
            <button className="np-btn np-btn-danger" onClick={handleClearAll}>🗑 Clear all</button>
          )}
        </div>
      </div>

      <div className="np-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`np-filter-btn ${filter === f ? 'np-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === 'Unread' && unreadCount > 0 && <span className="np-filter-badge">{unreadCount}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="np-loading"><div className="np-spinner" /><p>Loading notifications…</p></div>
      ) : filtered.length === 0 ? (
        <div className="np-empty">
          <div className="np-empty-icon">🔕</div>
          <h3>No notifications here</h3>
          <p>{filter === 'All' ? 'You have no notifications yet.' : `No ${filter.toLowerCase()} notifications.`}</p>
        </div>
      ) : (
        <div className="np-list">
          {filtered.map(n => (
            <div key={n.id} className={`np-card ${!n.read ? 'np-unread' : ''}`}>
              <div className="np-card-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
              <div className="np-card-body">
                <div className="np-card-top">
                  <span className="np-card-title">{n.title}</span>
                  <span className="np-card-time">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="np-card-msg">{n.message}</p>
                {!n.read && <span className="np-unread-pill">Unread</span>}
              </div>
              <div className="np-card-actions">
                {!n.read && (
                  <button className="np-action-btn np-btn-read" onClick={() => handleMarkRead(n.id)} title="Mark as read">✓</button>
                )}
                <button className="np-action-btn np-btn-del" onClick={() => handleDelete(n.id)} title="Delete">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
