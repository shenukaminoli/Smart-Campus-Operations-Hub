import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getNotifications, markAsRead, markAllAsRead,
  deleteNotification, clearAllNotifications,
} from '../api/notificationApi';
import '../styles/NotificationBell.css';

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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell({ currentUser, onViewAll }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data);
    } catch {
      // silent — never break the navbar on poll failure
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + 30-second polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open) fetchNotifications();
    setOpen(v => !v);
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch { /* silent */ }
  };

  const handleViewAll = () => {
    setOpen(false);
    if (onViewAll) onViewAll();
  };

  return (
    <div className="nb-wrapper" ref={wrapperRef}>
      <button className="nb-bell-btn" onClick={handleToggle} title="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <span className="nb-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="nb-mark-all" onClick={handleMarkAll}>Mark all as read</button>
            )}
          </div>

          <div className="nb-list">
            {loading && notifications.length === 0 ? (
              <div className="nb-loading"><div className="nb-spinner" /></div>
            ) : notifications.length === 0 ? (
              <div className="nb-empty">
                <span>🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={`nb-item ${!n.read ? 'nb-unread' : ''}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <div className="nb-item-icon">{TYPE_ICONS[n.type] || '🔔'}</div>
                <div className="nb-item-body">
                  <div className="nb-item-title">{n.title}</div>
                  <div className="nb-item-msg">{n.message}</div>
                  <div className="nb-item-time">{timeAgo(n.createdAt)}</div>
                </div>
                <button className="nb-item-del" onClick={(e) => handleDelete(e, n.id)} title="Dismiss">×</button>
              </div>
            ))}
          </div>

          <div className="nb-footer">
            {notifications.length > 0 && (
              <button className="nb-clear-all" onClick={handleClearAll}>Clear all</button>
            )}
            <button className="nb-view-all" onClick={handleViewAll}>View all notifications</button>
          </div>
        </div>
      )}
    </div>
  );
}
