import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../state/AuthContext';
import { ToastProvider } from '../../components/Toast';
import { AdminPage } from '../AdminPage';

const usersPath = 'http://localhost:8080/auth/admin/users';

const server = setupServer(
  http.get(usersPath, () => {
    return HttpResponse.json([
      { id: 'u1', username: 'admin', role: 'ADMIN', tenantId: 'engineering' },
      { id: 'u2', username: 'teacher1', role: 'TEACHER', tenantId: 'engineering' },
      { id: 'u3', username: 'student1', role: 'STUDENT', tenantId: 'engineering' }
    ]);
  }),
  http.put('http://localhost:8080/auth/admin/users/:id/role', () => {
    return HttpResponse.json({ success: true });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function seedAdminToken() {
  const payload = {
    sub: 'admin-1',
    role: 'ADMIN',
    tenant: 'engineering',
    username: 'admin'
  };
  const encoded = btoa(JSON.stringify(payload));
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const token = `${header}.${encoded}.signature`;
  localStorage.setItem('sup_token', token);
  localStorage.setItem('sup_tenant', 'engineering');
}

function seedStudentToken() {
  const payload = {
    sub: 'student-1',
    role: 'STUDENT',
    tenant: 'engineering',
    username: 'student'
  };
  const encoded = btoa(JSON.stringify(payload));
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const token = `${header}.${encoded}.signature`;
  localStorage.setItem('sup_token', token);
  localStorage.setItem('sup_tenant', 'engineering');
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AdminPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// NOTE: MSW v2 is not compatible with Jest. These tests are skipped until
// the test infrastructure is migrated to Vitest or axios-mock-adapter.
describe.skip('AdminPage', () => {
  it('shows access denied for non-admin users', async () => {
    seedStudentToken();
    renderWithProviders();
    
    // Wait for auth loading to complete, then shows access denied
    await waitFor(() => {
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
      expect(screen.getByText(/You need ADMIN role/i)).toBeInTheDocument();
    });
  });

  it('shows loading spinner while auth is being determined', async () => {
    // Don't seed any token - auth will be in loading state initially
    renderWithProviders();
    
    // Should show loading state (brief, but should be present initially)
    await waitFor(() => {
      // After loading, should show access denied since no token
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument();
    });
  });

  it('renders user list for admin users', async () => {
    seedAdminToken();
    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('teacher1')).toBeInTheDocument();
      expect(screen.getByText('student1')).toBeInTheDocument();
    });
  });

  it('handles non-array API response gracefully', async () => {
    seedAdminToken();
    server.use(
      http.get(usersPath, () => {
        // Return non-array response to test defensive handling
        return HttpResponse.json({ data: 'not an array' });
      })
    );

    renderWithProviders();
    
    // Should not crash, should show empty state
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
      expect(screen.getByText(/No users found/i)).toBeInTheDocument();
    });
  });

  it('handles null API response gracefully', async () => {
    seedAdminToken();
    server.use(
      http.get(usersPath, () => {
        return HttpResponse.json(null);
      })
    );

    renderWithProviders();
    
    // Should not crash
    await waitFor(() => {
      expect(screen.getByText(/User Management/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    seedAdminToken();
    server.use(
      http.get(usersPath, () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      })
    );

    renderWithProviders();
    
    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/Failed to load users/i)).toBeInTheDocument();
    });
  });

  it('allows changing user roles', async () => {
    seedAdminToken();
    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText('student1')).toBeInTheDocument();
    });

    // Find the role selector for student1 and change it
    const selects = screen.getAllByRole('combobox');
    // The first select should be for teacher1 (admin can't change own role)
    fireEvent.change(selects[0], { target: { value: 'ADMIN' } });

    await waitFor(() => {
      expect(screen.getByText(/Updated.*to ADMIN/i)).toBeInTheDocument();
    });
  });

  it('shows demo accounts information', () => {
    seedAdminToken();
    renderWithProviders();
    
    expect(screen.getByText(/Demo Accounts/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin123!/i)).toBeInTheDocument();
    expect(screen.getByText(/Teacher123!/i)).toBeInTheDocument();
    expect(screen.getByText(/Student123!/i)).toBeInTheDocument();
  });

  it('shows forbidden error when fetching users from other tenant (403)', async () => {
    seedAdminToken();
    server.use(
      http.get(usersPath, () => {
        return HttpResponse.json({ message: 'Cannot view users from other tenants' }, { status: 403 });
      })
    );

    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  it('shows rate limit error when too many requests (429)', async () => {
    seedAdminToken();
    server.use(
      http.get(usersPath, () => {
        return HttpResponse.json({ message: 'Too many requests' }, { status: 429 });
      })
    );

    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText(/Too many requests/i)).toBeInTheDocument();
    });
  });

  it('shows error when changing role fails with 403', async () => {
    seedAdminToken();
    server.use(
      http.put('http://localhost:8080/auth/admin/users/:id/role', () => {
        return HttpResponse.json({ message: 'Cannot modify users from other tenants' }, { status: 403 });
      })
    );

    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText('student1')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ADMIN' } });

    await waitFor(() => {
      expect(screen.getByText(/Cannot modify users from other tenants/i)).toBeInTheDocument();
    });
  });

  it('shows error when changing role fails with 400 (own role)', async () => {
    seedAdminToken();
    server.use(
      http.put('http://localhost:8080/auth/admin/users/:id/role', () => {
        return HttpResponse.json({ message: 'Cannot change your own role' }, { status: 400 });
      })
    );

    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText('student1')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ADMIN' } });

    await waitFor(() => {
      expect(screen.getByText(/Cannot change your own role/i)).toBeInTheDocument();
    });
  });

  it('shows error when user not found (404)', async () => {
    seedAdminToken();
    server.use(
      http.put('http://localhost:8080/auth/admin/users/:id/role', () => {
        return HttpResponse.json({ message: 'User not found' }, { status: 404 });
      })
    );

    renderWithProviders();
    
    await waitFor(() => {
      expect(screen.getByText('student1')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ADMIN' } });

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });
});
