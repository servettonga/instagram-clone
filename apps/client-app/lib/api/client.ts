// Axios instance with interceptors

import axios, { AxiosError, AxiosRequestConfig } from 'axios';;
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if it's already refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Only try to refresh if:
    // 1. Got 401 error
    // 2. Haven't already retried this request
    // 3. Not already on the refresh endpoint (prevent infinite loop)
    // 4. Not on auth endpoints that expect 401 for invalid credentials
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/refresh') &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/signup') &&
      !originalRequest.url?.includes('/api/auth/change-password') &&
      !originalRequest.url?.includes('/api/auth/set-password')
    ) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('refreshToken');

        // Check if refresh token exists and is valid format
        if (!refreshToken || refreshToken.split('.').length !== 3) {
          throw new Error('Invalid or missing refresh token');
        }

        // Call refresh endpoint
        const { data } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          }
        );

        // Store new tokens
        Cookies.set('accessToken', data.accessToken, { expires: 7 });
        Cookies.set('refreshToken', data.refreshToken, { expires: 30 });

        // Update authorization header for original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        // Process queued requests
        processQueue(null, data.accessToken);

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        console.error('Token refresh failed:', refreshError.message);

        // Clear tokens
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');

        // Process queued requests with error
        processQueue(refreshError, null);

        // Only redirect if not already on login page
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
