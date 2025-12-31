import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { api, setAuthContext, useConfiguredApi } from '../client';

// Create mock adapter for axios
let mockAxios: MockAdapter;

beforeEach(() => {
  mockAxios = new MockAdapter(api);
  // Reset auth context before each test
  setAuthContext(null, null);
});

afterEach(() => {
  mockAxios.restore();
});

describe('API Client', () => {
  describe('setAuthContext', () => {
    it('attaches Authorization header when token is set', async () => {
      mockAxios.onGet('/test').reply(200, { success: true });

      setAuthContext('test-jwt-token', null);

      const response = await api.get('/test');

      expect(response.status).toBe(200);
      expect(mockAxios.history.get[0].headers?.Authorization).toBe('Bearer test-jwt-token');
    });

    it('attaches X-Tenant-Id header when tenantId is set', async () => {
      mockAxios.onGet('/test').reply(200, { success: true });

      setAuthContext(null, 'engineering');

      const response = await api.get('/test');

      expect(response.status).toBe(200);
      expect(mockAxios.history.get[0].headers?.['X-Tenant-Id']).toBe('engineering');
    });

    it('attaches both headers when token and tenantId are set', async () => {
      mockAxios.onGet('/test').reply(200, { success: true });

      setAuthContext('test-jwt-token', 'science');

      const response = await api.get('/test');

      expect(response.status).toBe(200);
      expect(mockAxios.history.get[0].headers?.Authorization).toBe('Bearer test-jwt-token');
      expect(mockAxios.history.get[0].headers?.['X-Tenant-Id']).toBe('science');
    });

    it('does not attach headers when context is cleared', async () => {
      mockAxios.onGet('/test').reply(200, { success: true });

      // First set auth context
      setAuthContext('test-jwt-token', 'engineering');
      await api.get('/test');

      // Clear auth context
      setAuthContext(null, null);
      await api.get('/test');

      // Second request should not have Authorization header
      expect(mockAxios.history.get[1].headers?.Authorization).toBeUndefined();
    });
  });

  describe('Request interceptor', () => {
    it('adds headers to POST requests', async () => {
      mockAxios.onPost('/auth/login').reply(200, { token: 'abc' });

      setAuthContext('existing-token', 'tenant1');

      await api.post('/auth/login', { username: 'test' });

      expect(mockAxios.history.post[0].headers?.Authorization).toBe('Bearer existing-token');
      expect(mockAxios.history.post[0].headers?.['X-Tenant-Id']).toBe('tenant1');
    });
  });

  describe('Response interceptor', () => {
    it('passes successful responses through', async () => {
      mockAxios.onGet('/data').reply(200, { items: [1, 2, 3] });

      const response = await api.get('/data');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ items: [1, 2, 3] });
    });

    it('rejects with error on 4xx responses', async () => {
      mockAxios.onGet('/protected').reply(401, { message: 'Unauthorized' });

      await expect(api.get('/protected')).rejects.toMatchObject({
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      });
    });

    it('rejects with error on 5xx responses', async () => {
      mockAxios.onGet('/error').reply(500, { message: 'Internal Server Error' });

      await expect(api.get('/error')).rejects.toMatchObject({
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      });
    });

    it('handles 429 Too Many Requests (rate limiting)', async () => {
      mockAxios.onPost('/auth/login').reply(429, { message: 'Too many requests' });

      await expect(api.post('/auth/login', {})).rejects.toMatchObject({
        response: {
          status: 429,
        },
      });
    });

    it('handles 403 Forbidden', async () => {
      mockAxios.onGet('/admin/data').reply(403, { message: 'Forbidden' });

      await expect(api.get('/admin/data')).rejects.toMatchObject({
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      });
    });

    it('handles 423 Locked (account lockout)', async () => {
      mockAxios.onPost('/auth/login').reply(423, { message: 'Account is locked' });

      await expect(api.post('/auth/login', {})).rejects.toMatchObject({
        response: {
          status: 423,
          data: { message: 'Account is locked' },
        },
      });
    });

    it('handles 402 Payment Required', async () => {
      mockAxios.onPost('/market/orders/checkout').reply(402, { message: 'Payment required' });

      await expect(api.post('/market/orders/checkout', {})).rejects.toMatchObject({
        response: {
          status: 402,
          data: { message: 'Payment required' },
        },
      });
    });

    it('handles 409 Conflict', async () => {
      mockAxios.onPost('/booking/reservations').reply(409, { message: 'Slot already booked' });

      await expect(api.post('/booking/reservations', {})).rejects.toMatchObject({
        response: {
          status: 409,
          data: { message: 'Slot already booked' },
        },
      });
    });

    it('handles 400 Bad Request', async () => {
      mockAxios.onPost('/auth/register').reply(400, { message: 'Invalid data' });

      await expect(api.post('/auth/register', {})).rejects.toMatchObject({
        response: {
          status: 400,
          data: { message: 'Invalid data' },
        },
      });
    });
  });

  describe('useConfiguredApi', () => {
    it('returns the api instance', () => {
      const configuredApi = useConfiguredApi();

      expect(configuredApi).toBe(api);
    });
  });

  describe('API configuration', () => {
    it('has correct base URL', () => {
      // In test environment, VITE_API_BASE_URL is not set, so it defaults to localhost
      expect(api.defaults.baseURL).toBe('http://localhost:8080');
    });

    it('has timeout configured', () => {
      expect(api.defaults.timeout).toBe(10000);
    });
  });
});
