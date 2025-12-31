import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../state/AuthContext';
import { ToastProvider } from '../../components/Toast';
import { BookingPage } from '../BookingPage';

const server = setupServer(
  http.get('http://localhost:8080/booking/resources', () => {
    return HttpResponse.json([
      { id: 'r1', name: 'Room 101', type: 'CLASSROOM', capacity: 30 },
      { id: 'r2', name: 'Lab A', type: 'LAB', capacity: 20 }
    ]);
  }),
  http.get('http://localhost:8080/booking/reservations', () => {
    return HttpResponse.json([]);
  }),
  http.post('http://localhost:8080/booking/reservations', () => {
    return HttpResponse.json({ id: 'reservation-1' }, { status: 201 });
  }),
  http.post('http://localhost:8080/booking/resources', () => {
    return HttpResponse.json(
      { id: 'r3', name: 'Meeting Room 1', type: 'OTHER', capacity: 10 },
      { status: 201 }
    );
  }),
  http.delete('http://localhost:8080/booking/reservations/:id', () => {
    return new HttpResponse(null, { status: 204 });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function seedTeacherToken() {
  const payload = {
    sub: 'teacher-1',
    role: 'TEACHER',
    tenant: 'engineering'
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
    tenant: 'engineering'
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
          <BookingPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// NOTE: MSW v2 is not compatible with Jest. These tests are skipped until
// the test infrastructure is migrated to Vitest or axios-mock-adapter.
describe.skip('BookingPage', () => {
  it('handles non-array API response gracefully', async () => {
    server.use(
      http.get('http://localhost:8080/booking/resources', () => {
        // Return non-array response to test defensive handling
        return HttpResponse.json({ data: 'not an array' });
      }),
      http.get('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json(null);
      })
    );

    renderWithProviders();
    
    // Should not crash, should render the page structure
    await waitFor(() => {
      expect(screen.getByText(/Resource Booking/i)).toBeInTheDocument();
    });
  });

  it('handles Spring paginated response (Page<T>) for reservations', async () => {
    server.use(
      http.get('http://localhost:8080/booking/reservations', () => {
        // Return Spring Page<T> format with content field
        return HttpResponse.json({
          content: [
            { 
              id: 'res1', 
              resourceId: 'r1', 
              resourceName: 'Room 101',
              userId: 'user1',
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T11:00:00Z',
              status: 'CREATED'
            }
          ],
          totalPages: 1,
          totalElements: 1,
          size: 20,
          number: 0
        });
      })
    );

    renderWithProviders();
    
    // Should extract content from paginated response
    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully without crashing', async () => {
    server.use(
      http.get('http://localhost:8080/booking/resources', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      }),
      http.get('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 });
      })
    );

    renderWithProviders();
    
    // Should show error toast but not crash
    await waitFor(() => {
      expect(screen.getByText(/Failed to load booking data/i)).toBeInTheDocument();
    });
  });

  it('renders resources from API', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
      expect(screen.getByText(/Lab A/i)).toBeInTheDocument();
    });
  });

  it('creates reservation and shows success message', async () => {
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    // Use a deterministic datetime-local value
    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Reservation created successfully/i)).toBeInTheDocument();
    });
  });

  it('shows conflict message when reservation overlaps', async () => {
    server.use(
      http.post('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Conflict' }, { status: 409 });
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/slot is already booked/i)).toBeInTheDocument();
    });
  });

  it('shows forbidden message when user lacks permission (403)', async () => {
    server.use(
      http.post('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  it('shows not found message when resource is removed (404)', async () => {
    server.use(
      http.post('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Resource not found' }, { status: 404 });
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('shows rate limit message when too many requests (429)', async () => {
    server.use(
      http.post('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Too many requests' }, { status: 429 });
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many booking requests/i)).toBeInTheDocument();
    });
  });

  it('shows validation error message (400)', async () => {
    server.use(
      http.post('http://localhost:8080/booking/reservations', () => {
        return HttpResponse.json({ message: 'Reservation must be at least 30 minutes' }, { status: 400 });
      })
    );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Start time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/End time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2024-01-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2024-01-01T10:15' } });

    fireEvent.click(screen.getByRole('button', { name: /Request reservation/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 30 minutes/i)).toBeInTheDocument();
    });
  });

  it('shows resource creation form for teachers', async () => {
    seedTeacherToken();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    // Teacher should see "Add New Resource" button
    expect(screen.getByRole('button', { name: /Add New Resource/i })).toBeInTheDocument();
  });

  it('hides resource creation form for students', async () => {
    seedStudentToken();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    // Student should NOT see "Add New Resource" button
    expect(screen.queryByRole('button', { name: /Add New Resource/i })).not.toBeInTheDocument();
  });

  it('allows teacher to create a new resource', async () => {
    seedTeacherToken();
    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText(/Room 101/i)).toBeInTheDocument();
    });

    // Click to show the form
    fireEvent.click(screen.getByRole('button', { name: /Add New Resource/i }));

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Resource Name/i), { target: { value: 'Meeting Room 1' } });
    fireEvent.change(screen.getByLabelText(/Capacity/i), { target: { value: '10' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Create Resource/i }));

    await waitFor(() => {
      expect(screen.getByText(/Meeting Room 1/i)).toBeInTheDocument();
    });
  });
});