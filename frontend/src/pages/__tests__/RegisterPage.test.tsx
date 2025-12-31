import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../state/AuthContext';
import { RegisterPage } from '../RegisterPage';

// Mock JWT token with encoded payload
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZSI6IlNUVURFTlQiLCJ0ZW5hbnQiOiJlbmdpbmVlcmluZyJ9.mock';

const server = setupServer(
  http.post('http://localhost:8080/auth/register', () => {
    return HttpResponse.json(
      { token: mockToken },
      { status: 200 }
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

// Strong password that meets all requirements:
// - At least 8 characters
// - Contains uppercase letter
// - Contains lowercase letter
// - Contains digit
// - Contains special character (@#$%^&+=!*()_-)
const STRONG_PASSWORD = 'StrongPass1!';

// NOTE: MSW v2 is not compatible with Jest. These tests are skipped until
// the test infrastructure is migrated to Vitest or axios-mock-adapter.
describe.skip('RegisterPage', () => {
  it('renders registration form with all fields', () => {
    renderWithProviders();

    expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Choose a username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Create password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument();
  });

  it('registers successfully and stores token', async () => {
    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Registration failed/i)).not.toBeInTheDocument();
      expect(localStorage.getItem('sup_token')).toBe(mockToken);
    });
  });

  it('shows info about STUDENT role assignment', () => {
    renderWithProviders();

    // Users are informed they will be registered as students
    expect(screen.getByText(/registered as a student/i)).toBeInTheDocument();
  });

  it('shows error message when registration fails', async () => {
    server.use(
      http.post('http://localhost:8080/auth/register', () => {
        return HttpResponse.json(
          { message: 'Username already exists' },
          { status: 400 }
        );
      })
    );

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while submitting', async () => {
    // Delay response to test loading state
    server.use(
      http.post('http://localhost:8080/auth/register', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return HttpResponse.json({ token: mockToken }, { status: 200 });
      })
    );

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    // Check for loading state
    expect(screen.getByRole('button', { name: /Creating account/i })).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText(/Creating…/i)).not.toBeInTheDocument();
    });
  });

  it('validates password requirements before submission', () => {
    renderWithProviders();

    // Enter a weak password
    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: 'weak' } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: 'weak' } });

    // Button should be disabled for weak password
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
    
    // Should show missing requirements
    expect(screen.getByText(/Needs:/i)).toBeInTheDocument();
  });

  it('shows validation hints when form is incomplete', () => {
    renderWithProviders();

    // Enter short username
    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'ab' } });
    
    // Should show username too short hint
    expect(screen.getByText(/Username too short/i)).toBeInTheDocument();

    // Enter weak password
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: 'abc' } });
    
    // Should show password needs hint
    expect(screen.getByText(/Password needs:/i)).toBeInTheDocument();

    // Enter mismatched confirmation
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: 'xyz' } });
    
    // Should show passwords don't match hint
    expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument();
  });

  it('disables submit button when username is too short', () => {
    renderWithProviders();

    // Enter valid password but short username
    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'ab' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    // Button should be disabled
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
  });

  it('disables submit button when password is empty', () => {
    renderWithProviders();

    // Enter only username
    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'validuser' } });

    // Button should be disabled when password is empty
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
  });

  it('has link to login page', () => {
    renderWithProviders();

    const loginLink = screen.getByText(/Already have an account\?/i);
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('shows error when backend returns 409 (username exists)', async () => {
    server.use(
      http.post('http://localhost:8080/auth/register', () => {
        return HttpResponse.json(
          { message: 'Username already exists in this tenant' },
          { status: 409 }
        );
      })
    );

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already taken/i)).toBeInTheDocument();
    });
  });

  it('shows error when backend returns 429 (rate limit)', async () => {
    server.use(
      http.post('http://localhost:8080/auth/register', () => {
        return HttpResponse.json(
          { message: 'Too many requests' },
          { status: 429 }
        );
      })
    );

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many registration attempts/i)).toBeInTheDocument();
    });
  });

  it('shows error when backend returns 403 (forbidden)', async () => {
    server.use(
      http.post('http://localhost:8080/auth/register', () => {
        return HttpResponse.json(
          { message: 'Registration is not permitted' },
          { status: 403 }
        );
      })
    );

    renderWithProviders();

    fireEvent.change(screen.getByPlaceholderText(/Choose a username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Create password/i), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText(/Confirm your password/i), { target: { value: STRONG_PASSWORD } });

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/not permitted/i)).toBeInTheDocument();
    });
  });
});
