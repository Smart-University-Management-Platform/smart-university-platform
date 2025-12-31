import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/api/client';
import { LoginBackground } from '@/components/LoginBackground';
import { KittenStyle4Cartoon } from '@/components/kittens/KittenStyle4Cartoon';

interface MousePosition {
  x: number;
  y: number;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [tenantId, setTenantId] = useState('engineering');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  // 3D card tilt state
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [mouseOnCard, setMouseOnCard] = useState(false);
  const [shinePos, setShinePos] = useState<MousePosition>({ x: 50, y: 50 });
  const [isVisible, setIsVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 3D tilt effect handler
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Calculate rotation (max 15 degrees)
    const rotateY = (mouseX / (rect.width / 2)) * 10;
    const rotateX = -(mouseY / (rect.height / 2)) * 10;
    
    // Calculate shine position (0-100%)
    const shineX = ((e.clientX - rect.left) / rect.width) * 100;
    const shineY = ((e.clientY - rect.top) / rect.height) * 100;
    
    setTilt({ rotateX, rotateY });
    setShinePos({ x: shineX, y: shineY });
  }, []);

  const handleCardMouseEnter = () => setMouseOnCard(true);
  const handleCardMouseLeave = () => {
    setMouseOnCard(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setShinePos({ x: 50, y: 50 });
  };

  // SECURITY FIX: Removed tempo backdoor - all logins go through real authentication
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await api.post('/auth/login', { username, password, tenantId });
      const token = res.data.token as string;
      
      // FIX: Await login to ensure state is set before navigation
      const loginSuccess = await login(token, tenantId);
      if (loginSuccess) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('Failed to authenticate. Please try again.');
      }
    } catch (err: any) {
      // Handle Spring Boot error responses
      const data = err.response?.data;
      let message = 'Login failed. Please try again.';
      
      if (data?.message) {
        message = data.message;
      } else if (typeof data === 'string') {
        message = data;
      }
      
      // Provide helpful error messages based on status codes
      const status = err.response?.status;
      if (status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (status === 404) {
        setError('User not found. Please check your username and faculty.');
      } else if (status === 423) {
        // Account locked due to too many failed login attempts
        setError(message || 'Account is locked due to too many failed login attempts. Please try again later.');
      } else if (status === 429) {
        // Rate limiting
        setError('Too many login attempts. Please wait a moment before trying again.');
      } else if (status === 403) {
        // Forbidden
        setError('Access forbidden. Your account may not have permission to log in.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      {/* Interactive Background */}
      <LoginBackground />
      
      {/* Cute Kittens - they close eyes when you type password */}
      <KittenStyle4Cartoon isPasswordFocused={isPasswordFocused} />
      
      {/* Login Card with 3D tilt */}
      <div
        ref={cardRef}
        className={`login-card-3d ${isVisible ? 'visible' : ''}`}
        onMouseMove={handleCardMouseMove}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        style={{
          transform: `
            perspective(1000px)
            rotateX(${tilt.rotateX}deg)
            rotateY(${tilt.rotateY}deg)
            translateZ(0)
            ${isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)'}
          `,
          transition: mouseOnCard 
            ? 'transform 0.1s ease-out' 
            : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        {/* Shine effect overlay */}
        <div
          className="login-card-shine"
          style={{
            background: `radial-gradient(
              circle at ${shinePos.x}% ${shinePos.y}%,
              rgba(255, 255, 255, ${mouseOnCard ? 0.15 : 0}) 0%,
              transparent 50%
            )`,
            opacity: mouseOnCard ? 1 : 0,
          }}
        />
        
        {/* Glow border effect */}
        <div
          className="login-card-glow"
          style={{
            background: `radial-gradient(
              circle at ${shinePos.x}% ${shinePos.y}%,
              var(--accent, #38bdf8) 0%,
              transparent 50%
            )`,
            opacity: mouseOnCard ? 0.6 : 0,
          }}
        />
        
        {/* Card content */}
        <div className="login-card-content">
          {/* Header with animated icon */}
          <div className="login-header">
            <div className="login-icon-wrapper">
              <div className="login-icon">🎓</div>
              <div className="login-icon-ring" />
              <div className="login-icon-ring ring-2" />
            </div>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to manage bookings, exams, and campus activity.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon">👤</span>
                Username
              </label>
              <input
                className="form-input login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon">🔒</span>
                Password
              </label>
              <input
                className="form-input login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon">🏛️</span>
                Faculty / Department
              </label>
              <input
                className="form-input login-input"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="e.g. engineering"
                required
              />
            </div>
            
            {error && (
              <div className="login-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Demo accounts hint */}
            <div className="demo-hint">
              <details>
                <summary>Demo accounts (engineering tenant)</summary>
                <div className="demo-accounts-list">
                  <div className="demo-account" onClick={() => { setUsername('admin'); setPassword('Admin123!'); }}>
                    <span className="demo-role admin">ADMIN</span>
                    <span>admin / Admin123!</span>
                  </div>
                  <div className="demo-account" onClick={() => { setUsername('teacher'); setPassword('Teacher123!'); }}>
                    <span className="demo-role teacher">TEACHER</span>
                    <span>teacher / Teacher123!</span>
                  </div>
                  <div className="demo-account" onClick={() => { setUsername('student'); setPassword('Student123!'); }}>
                    <span className="demo-role student">STUDENT</span>
                    <span>student / Student123!</span>
                  </div>
                </div>
              </details>
            </div>
            
            <div className="login-footer">
              <button 
                type="submit" 
                className={`login-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                <span className="button-text">
                  {loading ? 'Signing in…' : 'Sign in'}
                </span>
                <span className="button-icon">→</span>
                {loading && <span className="button-spinner" />}
              </button>
              
              <Link to="/register" className="login-link">
                <span>New here?</span>
                <span className="link-highlight">Create account</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Login page styles - same as before */}
      <style>{`
        .login-page-wrapper {
          position: relative;
          height: calc(100vh - 70px);
          max-height: calc(100vh - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          overflow: hidden;
          box-sizing: border-box;
        }

        .login-card-3d {
          position: relative;
          width: 100%;
          max-width: 440px;
          z-index: 10;
          transform-style: preserve-3d;
          will-change: transform;
          opacity: 0;
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .login-card-3d.visible {
          opacity: 1;
        }

        .login-card-shine {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-xl, 24px);
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 2;
        }

        .login-card-glow {
          position: absolute;
          inset: -2px;
          border-radius: calc(var(--radius-xl, 24px) + 2px);
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: -1;
          filter: blur(20px);
        }

        .login-card-content {
          position: relative;
          padding: 1.75rem 2rem;
          background: var(--bg-card, linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.85)));
          border: 1px solid var(--border, rgba(148, 163, 184, 0.2));
          border-radius: var(--radius-xl, 24px);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 
            var(--shadow-lg, 0 16px 48px rgba(0, 0, 0, 0.5)),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
          overflow: hidden;
        }

        .login-card-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--accent-gradient, linear-gradient(135deg, #0ea5e9, #6366f1));
        }

        .login-header {
          text-align: center;
          margin-bottom: 1.25rem;
        }

        .login-icon-wrapper {
          position: relative;
          width: 60px;
          height: 60px;
          margin: 0 auto 1rem;
        }

        .login-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: var(--accent-gradient, linear-gradient(135deg, #0ea5e9, #6366f1));
          border-radius: 20px;
          box-shadow: 
            0 8px 32px rgba(56, 189, 248, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          animation: iconPulse 3s ease-in-out infinite;
          z-index: 2;
        }

        .login-icon-ring {
          position: absolute;
          inset: -6px;
          border: 2px solid var(--accent, #38bdf8);
          border-radius: 22px;
          opacity: 0.3;
          animation: ringPulse 2s ease-in-out infinite;
        }

        .login-icon-ring.ring-2 {
          inset: -14px;
          border-radius: 26px;
          opacity: 0.15;
          animation-delay: 0.5s;
        }

        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text, #f1f5f9);
          margin: 0 0 0.375rem;
          letter-spacing: -0.02em;
        }

        .login-subtitle {
          font-size: 0.825rem;
          color: var(--muted, #94a3b8);
          margin: 0;
          line-height: 1.4;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .login-form .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .login-form .form-field {
          margin-bottom: 0;
        }

        .label-icon {
          font-size: 0.875rem;
        }

        .login-input {
          padding: 0.6rem 0.875rem !important;
          font-size: 0.875rem !important;
          background: var(--bg-elevated, #1e293b) !important;
          border: 1px solid var(--border, rgba(148, 163, 184, 0.2)) !important;
          transition: all 0.3s ease !important;
        }

        .login-input:focus {
          border-color: var(--accent, #38bdf8) !important;
          box-shadow: 
            0 0 0 3px var(--accent-soft, rgba(56, 189, 248, 0.15)),
            0 0 20px rgba(56, 189, 248, 0.1) !important;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--danger-soft, rgba(248, 113, 113, 0.15));
          border: 1px solid var(--danger, #f87171);
          border-radius: var(--radius, 10px);
          color: var(--danger, #f87171);
          font-size: 0.875rem;
          font-weight: 500;
          animation: shakeError 0.5s ease;
        }

        @keyframes shakeError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }

        .error-icon {
          font-size: 1.1rem;
        }

        .login-footer {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }

        .login-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.65rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: white;
          background: var(--accent-gradient, linear-gradient(135deg, #0ea5e9, #6366f1));
          border: none;
          border-radius: var(--radius, 10px);
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 
            0 8px 24px rgba(56, 189, 248, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 32px rgba(56, 189, 248, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.15) inset;
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }

        .login-button:hover::before {
          left: 100%;
        }

        .button-text {
          position: relative;
          z-index: 1;
        }

        .button-icon {
          position: relative;
          z-index: 1;
          transition: transform 0.3s ease;
        }

        .login-button:hover .button-icon {
          transform: translateX(4px);
        }

        .button-spinner {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .login-button.loading .button-text,
        .login-button.loading .button-icon {
          opacity: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--muted, #94a3b8);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .login-link:hover {
          color: var(--text, #f1f5f9);
        }

        .link-highlight {
          color: var(--accent, #38bdf8);
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .login-link:hover .link-highlight {
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .demo-hint {
          margin-top: 0.5rem;
        }

        .demo-hint details {
          background: var(--bg-elevated, rgba(30, 41, 59, 0.8));
          border: 1px solid var(--border, rgba(148, 163, 184, 0.2));
          border-radius: var(--radius, 10px);
          overflow: hidden;
        }

        .demo-hint summary {
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: var(--muted, #94a3b8);
          cursor: pointer;
          user-select: none;
        }

        .demo-hint summary:hover {
          color: var(--text, #f1f5f9);
        }

        .demo-accounts-list {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .demo-account {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .demo-account:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.05));
        }

        .demo-role {
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 600;
        }

        .demo-role.admin {
          background: var(--danger-soft, rgba(239, 68, 68, 0.15));
          color: var(--danger, #ef4444);
        }

        .demo-role.teacher {
          background: var(--warning-soft, rgba(245, 158, 11, 0.15));
          color: var(--warning, #f59e0b);
        }

        .demo-role.student {
          background: var(--info-soft, rgba(56, 189, 248, 0.15));
          color: var(--info, #38bdf8);
        }

        @media (max-width: 480px) {
          .login-page-wrapper {
            padding: 1rem;
          }

          .login-card-content {
            padding: 1.5rem;
          }

          .login-title {
            font-size: 1.5rem;
          }

          .login-icon-wrapper {
            width: 64px;
            height: 64px;
          }

          .login-icon {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};
