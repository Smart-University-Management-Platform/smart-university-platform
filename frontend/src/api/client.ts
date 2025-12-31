import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

let currentToken: string | null = null;
let currentTenantId: string | null = null;

/**
 * Called by the AuthProvider whenever authentication state changes so that
 * outgoing requests always carry the latest JWT and tenant id.
 */
export function setAuthContext(token: string | null, tenantId: string | null) {
  currentToken = token;
  currentTenantId = tenantId;
}

// Attach a single interceptor that always reads the latest auth context.
api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  if (currentTenantId) {
    config.headers['X-Tenant-Id'] = currentTenantId;
  }
  return config;
});

// Response interceptor for better error handling and auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    
    // Handle 401 Unauthorized - auto-logout and redirect to login
    if (status === 401) {
      // Clear auth tokens from localStorage
      localStorage.removeItem('sup_token');
      localStorage.removeItem('sup_tenant');
      
      // Clear current auth context
      currentToken = null;
      currentTenantId = null;
      
      // Redirect to login page if not already there (avoid redirect loops)
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        // eslint-disable-next-line no-console
        console.warn('Session expired or unauthorized. Redirecting to login...');
        window.location.href = '/login';
      }
    }
    
    // Handle 429 Too Many Requests (Rate Limiting)
    if (status === 429) {
      // eslint-disable-next-line no-console
      console.warn('Rate limit exceeded. Please wait before trying again.');
      // Enhance error message for rate limiting
      if (error.response) {
        const data = error.response.data as Record<string, unknown> | undefined;
        if (!data?.message) {
          error.response.data = { 
            message: 'Too many requests. Please wait a moment before trying again.' 
          };
        }
      }
    }
    
    // Handle 403 Forbidden
    if (status === 403) {
      // eslint-disable-next-line no-console
      console.warn('Access forbidden. You do not have permission for this action.');
    }
    
    // Handle 423 Locked (Account lockout)
    if (status === 423) {
      // eslint-disable-next-line no-console
      console.warn('Account is locked due to too many failed login attempts.');
    }
    
    // Log errors for debugging (legitimate use case for API errors)
    if (error.response) {
      // eslint-disable-next-line no-console
      console.error(`API Error [${error.response.status}]:`, error.response.data);
    } else if (error.request) {
      // eslint-disable-next-line no-console
      console.error('API Error: No response received', error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export function useConfiguredApi() {
  return api;
}