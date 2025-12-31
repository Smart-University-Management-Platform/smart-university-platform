import React, { useEffect, useState, useCallback } from 'react';
import { useConfiguredApi } from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../components/Toast';

type User = {
  id: string;
  username: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  tenantId: string;
};

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

export const AdminPage: React.FC = () => {
  const api = useConfiguredApi();
  const { role, userId, isLoading: authLoading, isAuthenticated, token, tenantId } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    // Ensure we have both token and tenantId before making the API call
    // This prevents the race condition where React state is updated
    // but the API client context might not be synchronized yet
    if (!token || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<User[]>('/auth/admin/users');
      // Defensive check: ensure data is an array before setting state
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      const status = error.response?.status;
      let msg = 'Failed to load users';
      
      if (status === 403) {
        msg = 'You do not have permission to view users.';
      } else if (status === 429) {
        msg = 'Too many requests. Please wait a moment before trying again.';
      } else if (status === 401) {
        // Don't show toast for 401 - the API client will redirect to login
        return;
      }
      
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, token, tenantId, showToast]);

  // Only fetch users after auth is loaded and user is authenticated with ADMIN role
  // Also ensure token and tenantId are available for the API call
  useEffect(() => {
    if (!authLoading && isAuthenticated && role === 'ADMIN' && token && tenantId) {
      fetchUsers();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, role, token, tenantId, fetchUsers]);

  const handleRoleChange = useCallback(async (user: User, newRole: typeof ROLES[number]) => {
    if (user.role === newRole) return;
    
    setUpdating(user.id);
    try {
      await api.put(`/auth/admin/users/${user.id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));
      showToast(`Updated ${user.username} to ${newRole}`, 'success');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } };
      const status = error.response?.status;
      let msg = error.response?.data?.message || 'Failed to update role';
      
      if (status === 403) {
        msg = 'Cannot modify users from other tenants.';
      } else if (status === 400) {
        msg = error.response?.data?.message || 'Cannot change your own role.';
      } else if (status === 404) {
        msg = 'User not found. They may have been deleted.';
      } else if (status === 429) {
        msg = 'Too many requests. Please wait a moment before trying again.';
      }
      
      showToast(msg, 'error');
    } finally {
      setUpdating(null);
    }
  }, [api, showToast]);

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="app-grid">
        <section className="card">
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading...</span>
          </div>
        </section>
      </div>
    );
  }

  if (role !== 'ADMIN') {
    return (
      <div className="app-grid">
        <section className="card">
          <div className="card-header">
            <div className="card-title">🔒 Access Denied</div>
          </div>
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>
            You need ADMIN role to access this page.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-grid">
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <span className="title-icon">👥</span>
              User Management
            </div>
            <div className="card-subtitle">Manage user roles in your tenant</div>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={fetchUsers}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Loading users...</span>
          </div>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>
            No users found in this tenant.
          </p>
        ) : (
          <div className="users-table">
            <div className="users-header">
              <span>Username</span>
              <span>Current Role</span>
              <span>Actions</span>
            </div>
            {users.map(user => (
              <div key={user.id} className="user-row">
                <span className="user-name">
                  {user.username}
                  {user.id === userId && (
                    <span className="badge badge-you">You</span>
                  )}
                </span>
                <span className={`badge badge-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
                <div className="role-actions">
                  {user.id === userId ? (
                    <span className="muted-text">Cannot change own role</span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value as typeof ROLES[number])}
                      disabled={updating === user.id}
                      className="role-select"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                  {updating === user.id && <span className="spinner-small" />}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="info-box">
          <strong>💡 Role Permissions:</strong>
          <ul>
            <li><strong>STUDENT</strong> - Can book resources, purchase items, take exams</li>
            <li><strong>TEACHER</strong> - Can create products, create/manage exams, plus student permissions</li>
            <li><strong>ADMIN</strong> - Can manage users, plus teacher permissions</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">
            <span className="title-icon">🔑</span>
            Demo Accounts
          </div>
        </div>
        <div className="demo-accounts">
          <p>The following demo accounts are pre-created in the <strong>engineering</strong> tenant:</p>
          <table className="demo-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Password</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>admin</code></td>
                <td><code>Admin123!</code></td>
                <td><span className="badge badge-admin">ADMIN</span></td>
              </tr>
              <tr>
                <td><code>teacher</code></td>
                <td><code>Teacher123!</code></td>
                <td><span className="badge badge-teacher">TEACHER</span></td>
              </tr>
              <tr>
                <td><code>student</code></td>
                <td><code>Student123!</code></td>
                <td><span className="badge badge-student">STUDENT</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .title-icon {
          margin-right: 0.5rem;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          color: var(--muted);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .users-table {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .users-header {
          display: grid;
          grid-template-columns: 1fr 120px 200px;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-elevated);
          border-radius: var(--radius);
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .user-row {
          display: grid;
          grid-template-columns: 1fr 120px 200px;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-elevated);
          border-radius: var(--radius);
          align-items: center;
          transition: all 0.2s ease;
        }

        .user-row:hover {
          background: var(--bg-hover);
        }

        .user-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-student {
          background: var(--info-soft, rgba(56, 189, 248, 0.15));
          color: var(--info, #38bdf8);
        }

        .badge-teacher {
          background: var(--warning-soft, rgba(245, 158, 11, 0.15));
          color: var(--warning, #f59e0b);
        }

        .badge-admin {
          background: var(--danger-soft, rgba(239, 68, 68, 0.15));
          color: var(--danger, #ef4444);
        }

        .badge-you {
          background: var(--accent-soft, rgba(56, 189, 248, 0.1));
          color: var(--accent);
          font-size: 0.65rem;
        }

        .role-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .role-select {
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text);
          font-size: 0.85rem;
          cursor: pointer;
        }

        .role-select:hover:not(:disabled) {
          border-color: var(--accent);
        }

        .role-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .muted-text {
          color: var(--muted);
          font-size: 0.8rem;
          font-style: italic;
        }

        .info-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--accent-soft, rgba(56, 189, 248, 0.1));
          border-radius: var(--radius);
          border: 1px solid var(--accent);
          font-size: 0.85rem;
        }

        .info-box ul {
          margin: 0.5rem 0 0 1.5rem;
          padding: 0;
        }

        .info-box li {
          margin: 0.25rem 0;
          color: var(--muted);
        }

        .demo-accounts {
          font-size: 0.9rem;
        }

        .demo-accounts p {
          margin-bottom: 1rem;
          color: var(--muted);
        }

        .demo-table {
          width: 100%;
          border-collapse: collapse;
        }

        .demo-table th,
        .demo-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }

        .demo-table th {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 600;
        }

        .demo-table code {
          background: var(--bg-elevated);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn-secondary {
          background: var(--bg-elevated);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--accent);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
