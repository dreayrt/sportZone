const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors: any;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sz_auth_token');
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sz_auth_token', token);
}

export function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sz_auth_token');
  localStorage.removeItem('sz_user_data');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Không thể kết nối đến máy chủ.',
      data: null as any,
      errors: error,
    };
  }
}

export const api = {
  health: () => apiRequest('/health'),
  
  auth: {
    login: (body: { login: string; password: string }) =>
      apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body: { full_name: string; email?: string; phone: string; password: string; role?: string }) =>
      apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    me: () => apiRequest('/auth/me'),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  },

  sportCategories: {
    getAll: () => apiRequest('/sport-categories'),
    getOne: (idOrCode: string | number) => apiRequest(`/sport-categories/${idOrCode}`),
  },

  profile: {
    get: () => apiRequest('/profile'),
    update: (body: any) => apiRequest('/profile', { method: 'PUT', body: JSON.stringify(body) }),
    changePassword: (body: any) => apiRequest('/profile/password', { method: 'PUT', body: JSON.stringify(body) }),
  },

  bookings: {
    getAll: (params?: Record<string, string | number>) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/bookings${qs}`);
    },
    getOne: (idOrCode: string | number) => apiRequest(`/bookings/${idOrCode}`),
    create: (body: any) =>
      apiRequest('/bookings', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: any) =>
      apiRequest(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    cancel: (id: number, reason: string) =>
      apiRequest(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    checkIn: (id: number) =>
      apiRequest(`/bookings/${id}/check-in`, { method: 'POST' }),
    addAddon: (id: number, body: { addon_id: number; quantity: number }) =>
      apiRequest(`/bookings/${id}/addons`, { method: 'POST', body: JSON.stringify(body) }),
    removeAddon: (id: number, addonId: number) =>
      apiRequest(`/bookings/${id}/addons/${addonId}`, { method: 'DELETE' }),
    cancelUnpaid: (minutes = 30) =>
      apiRequest(`/owner/bookings/cancel-unpaid?minutes=${minutes}`, { method: 'POST' }),
    getCourtSlots: (courtId: number, date?: string) => {
      const qs = date ? `?date=${date}` : '';
      return apiRequest(`/courts/${courtId}/slots${qs}`);
    },
    getTimeline: (params?: { venue_id?: number; date?: string }) => {
      const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
      return apiRequest(`/owner/calendar${qs}`);
    },
  }
};
