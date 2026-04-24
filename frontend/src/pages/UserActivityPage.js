import { useState, useEffect } from 'react';
import { getAllLogs } from '../api/activityLogApi';
import '../styles/UserActivityPage.css';

const ACTION_COLORS = {
  LOGIN:                   { bg: '#f5f5f5', color: '#616161' },
  USER_REGISTERED:         { bg: '#e8f5e9', color: '#2e7d32' },
  BOOKING_CREATED:         { bg: '#e8f5e9', color: '#2e7d32' },
  BOOKING_APPROVED:        { bg: '#e3f2fd', color: '#1565c0' },
  BOOKING_REJECTED:        { bg: '#fce4ec', color: '#c62828' },
  BOOKING_CANCELLED:       { bg: '#fff3e0', color: '#e65100' },
  INCIDENT_CREATED:        { bg: '#e8f5e9', color: '#2e7d32' },
  INCIDENT_STATUS_CHANGED: { bg: '#f3e5f5', color: '#6a1b9a' },
  RESOURCE_CREATED:        { bg: '#e0f2f1', color: '#00695c' },
  RESOURCE_UPDATED:        { bg: '#e0f2f1', color: '#00695c' },
  RESOURCE_DELETED:        { bg: '#fce4ec', color: '#c62828' },
};

const ALL_ACTIONS = [
  'LOGIN', 'USER_REGISTERED',
  'BOOKING_CREATED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED',
  'INCIDENT_CREATED', 'INCIDENT_STATUS_CHANGED',
  'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_DELETED',
];

const DATE_RANGES = ['All time', 'Today', 'Last 7 days', 'Last 30 days'];

// LocalDateTime from Spring comes as array [Y,M,D,h,m,s] or ISO string
function parseDate(val) {
  if (!val) return null;
  if (Array.isArray(val)) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = val;
    return new Date(y, mo - 1, d, h, mi, s);
  }
  return new Date(val);
}

function timeAgo(val) {
  const date = parseDate(val);
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d}d ago`;
  return date.toLocaleDateString();
}

function fullDateTime(val) {
  const date = parseDate(val);
  if (!date) return '';
  return date.toLocaleString();
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function UserActivityPage({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('All time');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    getAllLogs()
      .then(res => setLogs(res.data))
      .catch(() => setToast({ message: 'Failed to load activity logs', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(log => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        (log.userName || '').toLowerCase().includes(q) ||
        (log.userEmail || '').toLowerCase().includes(q) ||
        (log.description || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    // Action filter
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    // Date range filter
    if (dateRange !== 'All time') {
      const date = parseDate(log.createdAt);
      if (!date) return false;
      const now = Date.now();
      if (dateRange === 'Today' && date < startOfDay()) return false;
      if (dateRange === 'Last 7 days' && now - date.getTime() > 7 * 86400000) return false;
      if (dateRange === 'Last 30 days' && now - date.getTime() > 30 * 86400000) return false;
    }
    return true;
  });

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="ua-access-denied">
        <div className="ua-denied-card">
          <div className="ua-denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>This page is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ua-page">
      {toast && <div className={`ua-toast ua-toast-${toast.type}`}>{toast.message}</div>}

      <div className="ua-header">
        <div>
          <h1>User Activity Log</h1>
          <p>Track all user actions across the system</p>
        </div>
        <div className="ua-header-meta">
          {!loading && <span className="ua-count">{filtered.length} entries</span>}
        </div>
      </div>

      <div className="ua-filters">
        <input
          className="ua-search"
          type="text"
          placeholder="Search by name, email or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="ua-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="ALL">All Actions</option>
          {ALL_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="ua-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
          {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="ua-loading">
          <div className="ua-spinner" />
          <p>Loading activity logs…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ua-empty">
          <div className="ua-empty-icon">📋</div>
          <h3>No activity found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="ua-table-wrap">
          <table className="ua-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const style = ACTION_COLORS[log.action] || { bg: '#f5f5f5', color: '#555' };
                return (
                  <tr key={log.id}>
                    <td>
                      <span className="ua-time" title={fullDateTime(log.createdAt)}>
                        {timeAgo(log.createdAt)}
                      </span>
                      <div className="ua-datetime">{fullDateTime(log.createdAt)}</div>
                    </td>
                    <td>
                      <div className="ua-user-name">{log.userName || '—'}</div>
                      <div className="ua-user-email">{log.userEmail || '—'}</div>
                    </td>
                    <td>
                      <span
                        className="ua-action-badge"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {(log.action || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="ua-description">{log.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
