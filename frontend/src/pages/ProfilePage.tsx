import React, { useState, useEffect } from 'react';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { useToast } from '../components/Toast';
import { useConfiguredApi } from '../api/client';

type NotificationSettings = {
  emailNotifications: boolean;
  bookingReminders: boolean;
  orderUpdates: boolean;
  examReminders: boolean;
};

type DisplaySettings = {
  compactView: boolean;
  showAnimations: boolean;
  autoRefreshDashboard: boolean;
  dashboardRefreshInterval: number;
};

type TeacherSettings = {
  defaultExamDuration: number;
  autoPublishProducts: boolean;
  showLowStockWarnings: boolean;
  lowStockThreshold: number;
};

type AdminSettings = {
  showSystemMetrics: boolean;
  enableAuditLog: boolean;
};

type UserSettings = {
  notifications: NotificationSettings;
  display: DisplaySettings;
  teacher?: TeacherSettings;
  admin?: AdminSettings;
};

const defaultSettings: UserSettings = {
  notifications: {
    emailNotifications: true,
    bookingReminders: true,
    orderUpdates: true,
    examReminders: true,
  },
  display: {
    compactView: false,
    showAnimations: true,
    autoRefreshDashboard: true,
    dashboardRefreshInterval: 6,
  },
  teacher: {
    defaultExamDuration: 60,
    autoPublishProducts: false,
    showLowStockWarnings: true,
    lowStockThreshold: 5,
  },
  admin: {
    showSystemMetrics: true,
    enableAuditLog: true,
  },
};

export const ProfilePage: React.FC = () => {
  const { username, role, tenantId, userId } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const api = useConfiguredApi();
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'display' | 'role'>('profile');
  const [hasChanges, setHasChanges] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(`settings_${userId}`);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, [userId]);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
    setHasChanges(false);
    showToast('Settings saved successfully', 'success');
  };

  // Password strength check
  const getPasswordStrength = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      digit: /\d/.test(pwd),
      special: /[@#$%^&+=!*()_-]/.test(pwd),
    };
    return requirements;
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validate
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const strength = getPasswordStrength(newPassword);
    if (!Object.values(strength).every(Boolean)) {
      setPasswordError('Password must be at least 8 characters with uppercase, lowercase, digit, and special character');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      showToast('Password changed successfully!', 'success');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400) {
        setPasswordError(err.response?.data?.message || 'Current password is incorrect');
      } else if (status === 401) {
        setPasswordError('Session expired. Please log in again.');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updateNotifications = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateDisplay = (key: keyof DisplaySettings, value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateTeacher = (key: keyof TeacherSettings, value: boolean | number) => {
    setSettings(prev => ({
      ...prev,
      teacher: { ...prev.teacher!, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateAdmin = (key: keyof AdminSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      admin: { ...prev.admin!, [key]: value }
    }));
    setHasChanges(true);
  };

  const getRoleBadgeClass = () => {
    switch (role) {
      case 'ADMIN': return 'badge-admin';
      case 'TEACHER': return 'badge-teacher';
      default: return 'badge-student';
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'TEACHER': return '📚';
      default: return '🎓';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'ADMIN':
        return 'Full system access including user management, all teacher capabilities, and system configuration.';
      case 'TEACHER':
        return 'Can create and manage exams, add products to marketplace, and access all student features.';
      default:
        return 'Can book resources, purchase from marketplace, take exams, and view dashboard.';
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'notifications' as const, label: 'Notifications', icon: '🔔' },
    { id: 'display' as const, label: 'Display', icon: '🎨' },
    ...(role === 'TEACHER' || role === 'ADMIN' ? [{ id: 'role' as const, label: role === 'ADMIN' ? 'Admin' : 'Teacher', icon: getRoleIcon() }] : []),
  ];

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="avatar-icon">{getRoleIcon()}</span>
          <div className="avatar-ring" />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{username}</h1>
          <div className="profile-meta">
            <span className={`role-badge ${getRoleBadgeClass()}`}>{role}</span>
            <span className="tenant-badge">🏛️ {tenantId}</span>
          </div>
        </div>
        {hasChanges && (
          <button className="save-button" onClick={saveSettings}>
            <span>💾</span> Save Changes
          </button>
        )}
      </div>

      <div className="settings-container">
        <nav className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <section className="settings-section">
              <h2 className="section-title">Profile Information</h2>
              
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-label">Username</div>
                  <div className="info-value">{username}</div>
                </div>
                <div className="info-card">
                  <div className="info-label">User ID</div>
                  <div className="info-value mono">{userId?.slice(0, 8)}...</div>
                </div>
                <div className="info-card">
                  <div className="info-label">Faculty / Department</div>
                  <div className="info-value">{tenantId}</div>
                </div>
                <div className="info-card">
                  <div className="info-label">Role</div>
                  <div className="info-value">
                    <span className={`role-badge ${getRoleBadgeClass()}`}>{role}</span>
                  </div>
                </div>
              </div>

              <div className="role-description">
                <h3>Your Permissions</h3>
                <p>{getRoleDescription()}</p>
                
                <div className="permissions-list">
                  <h4>Available Features:</h4>
                  <ul>
                    <li>✅ Book campus resources</li>
                    <li>✅ View and purchase from marketplace</li>
                    <li>✅ Take exams</li>
                    <li>✅ View live dashboard</li>
                    {(role === 'TEACHER' || role === 'ADMIN') && (
                      <>
                        <li>✅ Create and manage exams</li>
                        <li>✅ Add products to marketplace</li>
                      </>
                    )}
                    {role === 'ADMIN' && (
                      <>
                        <li>✅ Manage user roles</li>
                        <li>✅ Access admin panel</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="password-section">
                <h3>🔐 Security</h3>
                {!showPasswordForm ? (
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change Password
                  </button>
                ) : (
                  <form onSubmit={handlePasswordChange} className="password-form">
                    <div className="form-field">
                      <label htmlFor="current-password" className="form-label">Current Password</label>
                      <input
                        id="current-password"
                        type="password"
                        className="form-input"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="new-password" className="form-label">New Password</label>
                      <input
                        id="new-password"
                        type="password"
                        className="form-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        minLength={8}
                      />
                      {newPassword && (
                        <div className="password-requirements">
                          {(() => {
                            const strength = getPasswordStrength(newPassword);
                            return (
                              <ul>
                                <li className={strength.length ? 'met' : ''}>At least 8 characters</li>
                                <li className={strength.uppercase ? 'met' : ''}>Uppercase letter</li>
                                <li className={strength.lowercase ? 'met' : ''}>Lowercase letter</li>
                                <li className={strength.digit ? 'met' : ''}>Number</li>
                                <li className={strength.special ? 'met' : ''}>Special character (@#$%^&+=!*()_-)</li>
                              </ul>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="form-field">
                      <label htmlFor="confirm-password" className="form-label">Confirm New Password</label>
                      <input
                        id="confirm-password"
                        type="password"
                        className="form-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <span className="text-danger">Passwords do not match</span>
                      )}
                    </div>
                    {passwordError && <div className="text-danger">{passwordError}</div>}
                    <div className="form-actions">
                      <button 
                        type="submit" 
                        className="btn-primary"
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? 'Changing...' : 'Change Password'}
                      </button>
                      <button 
                        type="button" 
                        className="btn-ghost"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="settings-section">
              <h2 className="section-title">Notification Preferences</h2>
              
              <div className="settings-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📧</span>
                    <div>
                      <div className="setting-label">Email Notifications</div>
                      <div className="setting-desc">Receive important updates via email</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => updateNotifications('emailNotifications', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📅</span>
                    <div>
                      <div className="setting-label">Booking Reminders</div>
                      <div className="setting-desc">Get reminded before your reservations</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.bookingReminders}
                      onChange={(e) => updateNotifications('bookingReminders', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">🛒</span>
                    <div>
                      <div className="setting-label">Order Updates</div>
                      <div className="setting-desc">Notifications for order status changes</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.orderUpdates}
                      onChange={(e) => updateNotifications('orderUpdates', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📝</span>
                    <div>
                      <div className="setting-label">Exam Reminders</div>
                      <div className="setting-desc">Get notified about upcoming exams</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notifications.examReminders}
                      onChange={(e) => updateNotifications('examReminders', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'display' && (
            <section className="settings-section">
              <h2 className="section-title">Display Settings</h2>
              
              <div className="settings-group">
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">🌓</span>
                    <div>
                      <div className="setting-label">Theme</div>
                      <div className="setting-desc">Choose your preferred color scheme</div>
                    </div>
                  </div>
                  <select
                    className="setting-select"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                  >
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📐</span>
                    <div>
                      <div className="setting-label">Compact View</div>
                      <div className="setting-desc">Use smaller spacing and fonts</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.display.compactView}
                      onChange={(e) => updateDisplay('compactView', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">✨</span>
                    <div>
                      <div className="setting-label">Animations</div>
                      <div className="setting-desc">Enable UI animations and transitions</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.display.showAnimations}
                      onChange={(e) => updateDisplay('showAnimations', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">🔄</span>
                    <div>
                      <div className="setting-label">Auto-refresh Dashboard</div>
                      <div className="setting-desc">Automatically update sensor data</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.display.autoRefreshDashboard}
                      onChange={(e) => updateDisplay('autoRefreshDashboard', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {settings.display.autoRefreshDashboard && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-icon">⏱️</span>
                      <div>
                        <div className="setting-label">Refresh Interval</div>
                        <div className="setting-desc">How often to refresh dashboard data</div>
                      </div>
                    </div>
                    <select
                      className="setting-select"
                      value={settings.display.dashboardRefreshInterval}
                      onChange={(e) => updateDisplay('dashboardRefreshInterval', parseInt(e.target.value))}
                    >
                      <option value={3}>3 seconds</option>
                      <option value={6}>6 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                    </select>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'role' && role === 'TEACHER' && (
            <section className="settings-section">
              <h2 className="section-title">Teacher Settings</h2>
              
              <div className="settings-group">
                <h3 className="group-title">📝 Exam Defaults</h3>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">⏰</span>
                    <div>
                      <div className="setting-label">Default Exam Duration</div>
                      <div className="setting-desc">Default time limit for new exams</div>
                    </div>
                  </div>
                  <select
                    className="setting-select"
                    value={settings.teacher?.defaultExamDuration}
                    onChange={(e) => updateTeacher('defaultExamDuration', parseInt(e.target.value))}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              <div className="settings-group">
                <h3 className="group-title">🛒 Marketplace Settings</h3>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📦</span>
                    <div>
                      <div className="setting-label">Low Stock Warnings</div>
                      <div className="setting-desc">Get alerted when product stock is low</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.teacher?.showLowStockWarnings}
                      onChange={(e) => updateTeacher('showLowStockWarnings', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                {settings.teacher?.showLowStockWarnings && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <span className="setting-icon">📊</span>
                      <div>
                        <div className="setting-label">Low Stock Threshold</div>
                        <div className="setting-desc">Warn when stock falls below this number</div>
                      </div>
                    </div>
                    <input
                      type="number"
                      className="setting-input"
                      min={1}
                      max={100}
                      value={settings.teacher?.lowStockThreshold}
                      onChange={(e) => updateTeacher('lowStockThreshold', parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'role' && role === 'ADMIN' && (
            <section className="settings-section">
              <h2 className="section-title">Admin Settings</h2>
              
              <div className="settings-group">
                <h3 className="group-title">📊 System Monitoring</h3>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📈</span>
                    <div>
                      <div className="setting-label">Show System Metrics</div>
                      <div className="setting-desc">Display system health in dashboard</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.admin?.showSystemMetrics}
                      onChange={(e) => updateAdmin('showSystemMetrics', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📋</span>
                    <div>
                      <div className="setting-label">Enable Audit Log</div>
                      <div className="setting-desc">Track user actions for security</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.admin?.enableAuditLog}
                      onChange={(e) => updateAdmin('enableAuditLog', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="settings-group">
                <h3 className="group-title">📝 Inherited Teacher Settings</h3>
                
                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">⏰</span>
                    <div>
                      <div className="setting-label">Default Exam Duration</div>
                      <div className="setting-desc">Default time limit for new exams</div>
                    </div>
                  </div>
                  <select
                    className="setting-select"
                    value={settings.teacher?.defaultExamDuration}
                    onChange={(e) => updateTeacher('defaultExamDuration', parseInt(e.target.value))}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <span className="setting-icon">📦</span>
                    <div>
                      <div className="setting-label">Low Stock Warnings</div>
                      <div className="setting-desc">Get alerted when product stock is low</div>
                    </div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.teacher?.showLowStockWarnings}
                      onChange={(e) => updateTeacher('showLowStockWarnings', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="admin-quick-links">
                <h3 className="group-title">🔗 Quick Links</h3>
                <div className="quick-links-grid">
                  <a href="/admin" className="quick-link">
                    <span className="quick-link-icon">👥</span>
                    <span>User Management</span>
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        .profile-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
        }

        .profile-avatar {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          border-radius: 50%;
          font-size: 2rem;
        }

        .avatar-icon {
          position: relative;
          z-index: 2;
        }

        .avatar-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid var(--accent);
          border-radius: 50%;
          opacity: 0.3;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.1; }
        }

        .profile-info {
          flex: 1;
        }

        .profile-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          color: var(--text);
        }

        .profile-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
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

        .tenant-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 999px;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .save-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--success), #059669);
          color: white;
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .save-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        .settings-container {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .settings-tabs {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: var(--bg-elevated);
          border-right: 1px solid var(--border);
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-radius: var(--radius);
          color: var(--muted);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .tab-button:hover {
          background: var(--bg-hover);
          color: var(--text);
        }

        .tab-button.active {
          background: var(--accent-soft);
          color: var(--accent);
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .settings-content {
          padding: 1.5rem;
        }

        .settings-section {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0 0 1.5rem;
          color: var(--text);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-card {
          padding: 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }

        .info-label {
          font-size: 0.75rem;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .info-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        .info-value.mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
        }

        .role-description {
          padding: 1.25rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }

        .role-description h3 {
          margin: 0 0 0.5rem;
          font-size: 1rem;
        }

        .role-description p {
          margin: 0 0 1rem;
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .permissions-list h4 {
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          color: var(--muted);
        }

        .permissions-list ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .permissions-list li {
          padding: 0.25rem 0;
          font-size: 0.85rem;
          color: var(--text);
        }

        .settings-group {
          margin-bottom: 1.5rem;
        }

        .group-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--muted);
          margin: 0 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 0.5rem;
        }

        .setting-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .setting-icon {
          font-size: 1.25rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border-radius: 10px;
        }

        .setting-label {
          font-weight: 600;
          color: var(--text);
          font-size: 0.9rem;
        }

        .setting-desc {
          font-size: 0.75rem;
          color: var(--muted);
          margin-top: 0.125rem;
        }

        .toggle {
          position: relative;
          width: 48px;
          height: 26px;
          cursor: pointer;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: var(--border);
          border-radius: 26px;
          transition: all 0.3s ease;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle input:checked + .toggle-slider {
          background: var(--success);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(22px);
        }

        .setting-select {
          padding: 0.5rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 0.85rem;
          cursor: pointer;
          min-width: 140px;
        }

        .setting-input {
          padding: 0.5rem 0.75rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-size: 0.85rem;
          width: 80px;
          text-align: center;
        }

        .admin-quick-links {
          margin-top: 1.5rem;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.75rem;
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .quick-link:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
        }

        .quick-link-icon {
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .settings-container {
            grid-template-columns: 1fr;
          }

          .settings-tabs {
            flex-direction: row;
            overflow-x: auto;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }

          .tab-button {
            flex-shrink: 0;
          }

          .tab-label {
            display: none;
          }

          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .profile-meta {
            justify-content: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
