import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProfilePage } from '../ProfilePage';
import { AuthProvider } from '../../state/AuthContext';
import { ThemeProvider } from '../../state/ThemeContext';
import { ToastProvider } from '../../components/Toast';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Helper to create a mock JWT token with proper structure
const createMockToken = (payload: Record<string, unknown>) => {
  // Add expiration 1 hour in the future
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const fullPayload = { ...payload, exp };
  return btoa(JSON.stringify({ alg: 'HS256' })) + '.' +
    btoa(JSON.stringify(fullPayload)) + '.signature';
};

// Setup mock token with user info (matching AuthContext expected fields)
const mockStudentToken = createMockToken({
  sub: 'user-123',
  username: 'testuser',
  role: 'STUDENT',
  tenant: 'engineering'
});

const mockTeacherToken = createMockToken({
  sub: 'user-456',
  username: 'teacher1',
  role: 'TEACHER',
  tenant: 'engineering'
});

const mockAdminToken = createMockToken({
  sub: 'user-789',
  username: 'admin1',
  role: 'ADMIN',
  tenant: 'engineering'
});

const renderWithProviders = (initialToken: string | null = mockStudentToken) => {
  mockLocalStorage.clear();
  if (initialToken) {
    mockLocalStorage.setItem('sup_token', initialToken);
    mockLocalStorage.setItem('sup_tenant', 'engineering');
  }
  
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ProfilePage />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('ProfilePage', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('renders profile information for student', () => {
    renderWithProviders(mockStudentToken);
    
    // Username appears in header and info card
    expect(screen.getAllByText('testuser').length).toBeGreaterThan(0);
    expect(screen.getAllByText('STUDENT').length).toBeGreaterThan(0);
    expect(screen.getByText('engineering')).toBeInTheDocument();
  });

  it('displays role-specific permissions for student', () => {
    renderWithProviders(mockStudentToken);
    
    expect(screen.getByText('Your Permissions')).toBeInTheDocument();
    expect(screen.getByText(/Book campus resources/)).toBeInTheDocument();
    expect(screen.getByText(/Take exams/)).toBeInTheDocument();
    // Students should NOT see teacher/admin features in permissions
    expect(screen.queryByText(/Create and manage exams/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manage user roles/)).not.toBeInTheDocument();
  });

  it('allows switching between tabs', () => {
    renderWithProviders(mockStudentToken);
    
    // Start on Profile tab
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    
    // Switch to Notifications tab
    fireEvent.click(screen.getByText('Notifications'));
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    
    // Switch to Display tab
    fireEvent.click(screen.getByText('Display'));
    expect(screen.getByText('Display Settings')).toBeInTheDocument();
  });

  it('shows save button when settings change', () => {
    renderWithProviders(mockStudentToken);
    
    // Initially no save button
    expect(screen.queryByText(/Save Changes/)).not.toBeInTheDocument();
    
    // Go to notifications and toggle a setting
    fireEvent.click(screen.getByText('Notifications'));
    const toggles = screen.getAllByRole('checkbox');
    fireEvent.click(toggles[0]);
    
    // Save button should now appear
    expect(screen.getByText(/Save Changes/)).toBeInTheDocument();
  });

  it('displays teacher-specific settings for teacher role', () => {
    renderWithProviders(mockTeacherToken);
    
    // Teacher should see the Teacher tab
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    
    // Click on Teacher tab
    fireEvent.click(screen.getByText('Teacher'));
    expect(screen.getByText('Teacher Settings')).toBeInTheDocument();
    expect(screen.getByText('Default Exam Duration')).toBeInTheDocument();
  });

  it('displays admin-specific settings for admin role', () => {
    renderWithProviders(mockAdminToken);
    
    // Admin should see the Admin tab
    expect(screen.getByText('Admin')).toBeInTheDocument();
    
    // Click on Admin tab
    fireEvent.click(screen.getByText('Admin'));
    expect(screen.getByText('Admin Settings')).toBeInTheDocument();
    expect(screen.getByText('Show System Metrics')).toBeInTheDocument();
    // Quick Links has emoji prefix, so use a regex or check for User Management link
    expect(screen.getByText(/Quick Links/)).toBeInTheDocument();
  });

  it('shows password change button and form', () => {
    renderWithProviders(mockStudentToken);
    
    // Should see the Security section with Change Password button
    expect(screen.getByText(/Security/)).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    
    // Click to show password form
    fireEvent.click(screen.getByText('Change Password'));
    
    // Form should now be visible
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('shows password requirements as user types', () => {
    renderWithProviders(mockStudentToken);
    
    // Open password form
    fireEvent.click(screen.getByText('Change Password'));
    
    // Type a weak password
    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'abc' } });
    
    // Requirements should show
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Number')).toBeInTheDocument();
    expect(screen.getByText(/Special character/)).toBeInTheDocument();
  });

  it('allows cancelling password change', () => {
    renderWithProviders(mockStudentToken);
    
    // Open password form
    fireEvent.click(screen.getByText('Change Password'));
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    
    // Click Cancel
    fireEvent.click(screen.getByText('Cancel'));
    
    // Form should be hidden
    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('shows password mismatch error', () => {
    renderWithProviders(mockStudentToken);
    
    // Open password form
    fireEvent.click(screen.getByText('Change Password'));
    
    // Enter mismatched passwords
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'Test123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });
    
    // Should show mismatch error
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });
});
