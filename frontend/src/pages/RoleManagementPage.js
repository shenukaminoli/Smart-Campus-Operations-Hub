import { useState, useEffect } from 'react';
import {
  getAllUsers, getUserStats, searchUsers,
  updateUserRole, deactivateUser, activateUser, deleteUser,
} from '../api/userApi';
import '../styles/RoleManagementPage.css';

const ROLE_COLORS = {
  ADMIN:      { background: '#fce4ec', color: '#c62828' },
  STAFF:      { background: '#e3f2fd', color: '#1565c0' },
  STUDENT:    { background: '#e8f5e9', color: '#2e7d32' },
  TECHNICIAN: { background: '#fff3e0', color: '#e65100' },
};

const ROLES = ['STUDENT', 'STAFF', 'ADMIN', 'TECHNICIAN'];

export default function RoleManagementPage({ currentUser }) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortAsc, setSortAsc] = useState(true);
  const [toast, setToast] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Single effect handles initial load, search debounce, and refresh
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    if (!searchQuery.trim()) {
      setLoading(true);
      Promise.all([getAllUsers(), getUserStats()])
        .then(([usersRes, statsRes]) => {
          if (!cancelled) {
            setUsers(usersRes.data);
            setStats(statsRes.data);
          }
        })
        .catch(() => {
          if (!cancelled) setToast({ message: 'Failed to load users', type: 'error' });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }

    const t = setTimeout(() => {
      setLoading(true);
      searchUsers(searchQuery)
        .then(res => { if (!cancelled) setUsers(res.data); })
        .catch(() => { if (!cancelled) setToast({ message: 'Search failed', type: 'error' }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 400);

    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQuery, isAdmin, refreshKey]);

  const doRefresh = () => setRefreshKey(k => k + 1);

  const filteredUsers = [...users]
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u => {
      if (statusFilter === 'ALL') return true;
      return statusFilter === 'ACTIVE' ? u.active : !u.active;
    })
    .sort((a, b) => {
      const cmp = a.fullName.localeCompare(b.fullName);
      return sortAsc ? cmp : -cmp;
    });

  const handleRoleChange = async () => {
    const { user, selectedRole } = roleModal;
    try {
      await updateUserRole(user.id, selectedRole);
      setToast({ message: `Role updated to ${selectedRole} for ${user.fullName}`, type: 'success' });
      setRoleModal(null);
      doRefresh();
    } catch {
      setToast({ message: 'Failed to update role', type: 'error' });
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser.id) {
      setToast({ message: 'You cannot deactivate your own account', type: 'error' });
      return;
    }
    try {
      if (user.active) {
        await deactivateUser(user.id);
        setToast({ message: `${user.fullName} deactivated`, type: 'success' });
      } else {
        await activateUser(user.id);
        setToast({ message: `${user.fullName} activated`, type: 'success' });
      }
      doRefresh();
    } catch {
      setToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(deleteConfirm.id);
      setToast({ message: `${deleteConfirm.fullName} deleted`, type: 'success' });
      setDeleteConfirm(null);
      doRefresh();
    } catch {
      setToast({ message: 'Failed to delete user', type: 'error' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="rm-access-denied">
        <div className="rm-access-denied-card">
          <div className="rm-ad-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>This area is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Total Users',  value: stats.total,      icon: '👥', color: '#003366' },
    { label: 'Students',     value: stats.student,     icon: '🎓', color: '#2e7d32' },
    { label: 'Staff',        value: stats.staff,       icon: '👔', color: '#1565c0' },
    { label: 'Admins',       value: stats.admin,       icon: '🛡️', color: '#c62828' },
    { label: 'Technicians',  value: stats.technician,  icon: '🔧', color: '#e65100' },
    { label: 'Active',       value: stats.active,      icon: '✅', color: '#2e7d32' },
    { label: 'Inactive',     value: stats.inactive,    icon: '⏸️', color: '#757575' },
  ] : [];

  return (
    <div className="rm-page">
      {toast && (
        <div className={`rm-toast rm-toast-${toast.type}`}>{toast.message}</div>
      )}

      <div className="rm-header">
        <h1>Admin Panel</h1>
        <p>Manage user roles, status, and access across the campus system</p>
      </div>

      {stats && (
        <div className="rm-stats-grid">
          {statCards.map(card => (
            <div key={card.label} className="rm-stat-card" style={{ borderTop: `4px solid ${card.color}` }}>
              <div className="rm-stat-icon">{card.icon}</div>
              <div className="rm-stat-value" style={{ color: card.color }}>{card.value}</div>
              <div className="rm-stat-label">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rm-controls">
        <input
          className="rm-search"
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select className="rm-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="ALL">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="rm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="rm-btn-refresh" onClick={doRefresh}>↺ Refresh</button>
      </div>

      <div className="rm-table-wrapper">
        {loading ? (
          <div className="rm-loading">
            <div className="rm-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <table className="rm-table">
            <thead>
              <tr>
                <th className="rm-sortable" onClick={() => setSortAsc(v => !v)}>
                  Name {sortAsc ? '▲' : '▼'}
                </th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="rm-empty">No users found</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className={user.id === currentUser.id ? 'rm-row-self' : ''}>
                  <td>
                    <span className="rm-user-name">{user.fullName}</span>
                    {user.id === currentUser.id && <span className="rm-you-badge">You</span>}
                  </td>
                  <td className="rm-email">{user.email}</td>
                  <td>
                    <span className="rm-role-badge" style={ROLE_COLORS[user.role] || ROLE_COLORS.STUDENT}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.department || '—'}</td>
                  <td>
                    <span className={`rm-status-badge ${user.active ? 'rm-active' : 'rm-inactive'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="rm-actions">
                      <button
                        className="rm-btn rm-btn-role"
                        onClick={() => setRoleModal({ user, selectedRole: user.role })}
                        disabled={user.id === currentUser.id}
                        title={user.id === currentUser.id ? 'Cannot change your own role' : 'Change role'}
                      >
                        Change Role
                      </button>
                      <button
                        className={`rm-btn ${user.active ? 'rm-btn-deactivate' : 'rm-btn-activate'}`}
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser.id}
                        title={user.id === currentUser.id ? 'Cannot deactivate yourself' : ''}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="rm-btn rm-btn-delete"
                        onClick={() => setDeleteConfirm(user)}
                        disabled={user.id === currentUser.id}
                        title={user.id === currentUser.id ? 'Cannot delete yourself' : 'Delete user'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {roleModal && (
        <div className="rm-overlay" onClick={() => setRoleModal(null)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <h3>Change Role</h3>
            <p>Updating role for <strong>{roleModal.user.fullName}</strong></p>
            <div className="rm-modal-current">
              Current:&nbsp;
              <span className="rm-role-badge" style={ROLE_COLORS[roleModal.user.role]}>
                {roleModal.user.role}
              </span>
            </div>
            <select
              className="rm-select rm-modal-select"
              value={roleModal.selectedRole}
              onChange={e => setRoleModal(prev => ({ ...prev, selectedRole: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="rm-modal-btns">
              <button className="rm-btn rm-btn-cancel" onClick={() => setRoleModal(null)}>Cancel</button>
              <button className="rm-btn rm-btn-confirm" onClick={handleRoleChange}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="rm-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>
              Permanently delete <strong>{deleteConfirm.fullName}</strong>?
              This action cannot be undone.
            </p>
            <div className="rm-modal-btns">
              <button className="rm-btn rm-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="rm-btn rm-btn-delete" onClick={handleDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
