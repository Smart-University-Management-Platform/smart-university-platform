import React from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth, AuthProvider } from './state/AuthContext';
import { ThemeProvider } from './state/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BookingPage } from './pages/BookingPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { ExamsPage } from './pages/ExamsPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { ToastProvider } from './components/Toast';
import { ServiceStatus } from './components/ServiceStatus';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';

const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  
  // Wait for auth to finish loading before deciding to redirect
  if (isLoading) {
    return (
      <div className="app-grid">
        <section className="card">
          <div className="loading-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem' }}>
            <div className="spinner" />
            <span>Loading...</span>
          </div>
        </section>
      </div>
    );
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { token, role, tenantId, logout } = useAuth();

  return (
    <ToastProvider>
    <div className="app-shell">
      <header className="app-nav">
        <div className="app-nav-title">
          <div className="app-nav-orb" />
          <div>
            <div>Smart University</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Microservices platform</div>
          </div>
        </div>
        <nav className="app-nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => 'app-nav-link' + (isActive ? ' app-nav-link-active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/booking" className={({ isActive }) => 'app-nav-link' + (isActive ? ' app-nav-link-active' : '')}>
            Booking
          </NavLink>
          <NavLink to="/market" className={({ isActive }) => 'app-nav-link' + (isActive ? ' app-nav-link-active' : '')}>
            Marketplace
          </NavLink>
          <NavLink to="/exams" className={({ isActive }) => 'app-nav-link' + (isActive ? ' app-nav-link-active' : '')}>
            Exams
          </NavLink>
          {role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => 'app-nav-link' + (isActive ? ' app-nav-link-active' : '')}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="app-nav-user">
          <ServiceStatus />
          <ThemeToggle size="sm" />
          {token ? (
            <>
              <NavLink to="/profile" className="app-nav-profile-link">
                <span className="app-nav-avatar">{role === 'ADMIN' ? '👑' : role === 'TEACHER' ? '📚' : '🎓'}</span>
                <div className="app-nav-pill">
                  <span>{role ?? 'USER'}</span> · {tenantId ?? 'tenant'}
                </div>
              </NavLink>
              <button type="button" className="app-nav-logout" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="app-nav-link app-nav-link-active">
              Sign in
            </NavLink>
          )}
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <ErrorBoundary>
                  <DashboardPage />
                </ErrorBoundary>
              </Protected>
            }
          />
          <Route
            path="/booking"
            element={
              <Protected>
                <ErrorBoundary>
                  <BookingPage />
                </ErrorBoundary>
              </Protected>
            }
          />
          <Route
            path="/market"
            element={
              <Protected>
                <ErrorBoundary>
                  <MarketplacePage />
                </ErrorBoundary>
              </Protected>
            }
          />
          <Route
            path="/exams"
            element={
              <Protected>
                <ErrorBoundary>
                  <ExamsPage />
                </ErrorBoundary>
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected>
                <ErrorBoundary>
                  <AdminPage />
                </ErrorBoundary>
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <ErrorBoundary>
                  <ProfilePage />
                </ErrorBoundary>
              </Protected>
            }
          />

          <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    </ToastProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};