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
    forgotPassword: (body: { email: string }) =>
      apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (body: { email: string; token: string; password: string; password_confirmation: string }) =>
      apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
    getSocialRedirectUrl: (provider: 'google' | 'facebook') =>
      apiRequest<{ url: string }>(`/auth/${provider}/redirect`),
    linkSocial: (provider: 'google' | 'facebook', redirect?: string) =>
      apiRequest<{ url: string }>(`/social/${provider}/link${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`),
    unlinkSocial: (provider: 'google' | 'facebook') =>
      apiRequest(`/social/${provider}/unlink`, { method: 'DELETE' }),
  },

  sportCategories: {
    getAll: () => apiRequest('/sport-categories'),
    getOne: (idOrCode: string | number) => apiRequest(`/sport-categories/${idOrCode}`),
  },

  profile: {
    get: () => apiRequest('/profile'),
    update: (body: any) => apiRequest('/profile', { method: 'PUT', body: JSON.stringify(body) }),
    changePassword: (body: any) => apiRequest('/profile/password', { method: 'PUT', body: JSON.stringify(body) }),
    uploadAvatar: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getStoredToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = `${API_BASE_URL}/profile/avatar`;
      return fetch(url, { method: 'POST', headers, body: formData })
        .then(async (res): Promise<ApiResponse> => {
          try {
            return await res.json();
          } catch {
            return { success: false, message: 'Upload thất bại.', data: null, errors: null };
          }
        })
        .catch((error: any): ApiResponse => ({
          success: false,
          message: error?.message || 'Không thể kết nối đến máy chủ.',
          data: null,
          errors: error,
        }));
    },
  },

  admin: {
    users: {
      list: (params?: { search?: string; role?: string; status?: string; page?: number; per_page?: number }) => {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.role) query.set('role', params.role);
        if (params?.status) query.set('status', params.status);
        if (params?.page) query.set('page', String(params.page));
        if (params?.per_page) query.set('per_page', String(params.per_page));
        const qs = query.toString();
        return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
      },
      updateStatus: (id: number, status: 'active' | 'blocked') =>
        apiRequest(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
      updateRole: (id: number, role: string) =>
        apiRequest(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
    },
  }
};
