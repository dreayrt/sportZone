const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors: any;
}

export interface VoucherItem {
  id: number;
  code: string;
  name: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_discount: number | null;
  min_order_value: number;
  usage_limit: number | null;
  used_count: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'inactive';
}

export interface MatchPostItem {
  id: number;
  user_id: number;
  sport_category_id: number;
  venue_id: number | null;
  court_id: number | null;
  title: string;
  description: string | null;
  match_date: string;
  start_time: string;
  end_time: string;
  location_note: string | null;
  skill_level: 'all' | 'beginner' | 'intermediate' | 'advanced';
  required_members: number;
  current_members: number;
  estimated_cost_per_person: number | null;
  contact_phone: string | null;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  creator?: { id: number; full_name: string; avatar: string | null };
  sport_category?: { id: number; code: string; name: string };
  venue?: { id: number; name: string; address?: string; district?: string; city?: string } | null;
  court?: { id: number; name: string } | null;
  accepted_members?: Array<{ id: number; user: { id: number; full_name: string; avatar: string | null } }>;
  pending_members?: Array<{ id: number; message: string | null; user: { id: number; full_name: string; phone: string | null; avatar: string | null } }>;
  is_creator?: boolean;
  my_application?: { id: number; status: 'pending' | 'accepted' | 'rejected' | 'left'; message: string | null } | null;
}

export interface PaginatedData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SepayPaymentQr {
  provider: 'sepay';
  method: 'vietqr';
  qr_image_url: string;
  bank_name: string;
  account_no: string;
  account_name: string;
  amount: number;
  transfer_content: string;
  expires_in_minutes: number;
  expires_at: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: number | null;
  channel: 'in_app' | 'email' | 'sms' | 'push';
  is_read: boolean;
  read_at: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string | null;
}

export interface NotificationListData {
  notifications: NotificationItem[];
  unread_count: number;
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface RevenueChartPoint {
  date: string;
  label: string;
  revenue: number;
}

export interface BookingStatistics {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface OwnerAnalyticsData {
  revenue: {
    today: number;
    this_week: number;
    this_month: number;
    this_year: number;
  };
  booking_statistics: BookingStatistics;
  revenue_chart: RevenueChartPoint[];
  top_courts: Array<{
    court_id: number;
    court_name: string;
    venue_name: string;
    total_bookings: number;
    revenue: number;
  }>;
  peak_hours: Array<{
    hour: number;
    label: string;
    booking_count: number;
  }>;
}

export interface AdminAnalyticsData {
  overview: {
    total_gmv: number;
    total_users: number;
    total_customers: number;
    total_owners: number;
    total_venues: number;
    total_courts: number;
    total_bookings: number;
    total_completed_bookings: number;
  };
  revenue_chart: RevenueChartPoint[];
  user_growth: Array<{
    date: string;
    label: string;
    new_users: number;
  }>;
  booking_statistics: BookingStatistics;
}

export type ReferralRewardStatus = 'pending' | 'completed' | 'cancelled';

export interface ClaimedReferral {
  id: number;
  code: string;
  referrer: {
    id: number;
    full_name: string;
  };
  reward_type: 'points' | 'voucher' | 'cash';
  reward_value: number;
  status: ReferralRewardStatus;
  created_at: string | null;
  completed_at: string | null;
}

export interface ReferralData {
  code: string;
  referral_link: string;
  is_active: boolean;
  total_referrals: number;
  total_rewards: number;
  reward_policy: {
    reward_type: 'points';
    referrer_points: number;
    referred_points: number;
    completion_condition: 'first_completed_booking';
  };
  has_claimed_referral: boolean;
  claimed_referral: ClaimedReferral | null;
  recent_rewards: Array<{
    id: number;
    referred_user: {
      id: number;
      full_name: string;
    };
    reward_type: 'points' | 'voucher' | 'cash';
    reward_value: number;
    status: ReferralRewardStatus;
    created_at: string | null;
    completed_at: string | null;
  }>;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltySummaryData {
  current_points: number;
  lifetime_points: number;
  current_tier: LoyaltyTier;
  next_tier: LoyaltyTier | null;
  points_to_next_tier: number;
  progress_percent: number;
  tier_thresholds: Record<LoyaltyTier, number>;
  earning_rule: {
    amount_vnd: number;
    points: number;
  };
  redemption: {
    enabled: boolean;
    reason: string;
  };
}

export interface LoyaltyTransaction {
  id: number;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'refund';
  points: number;
  balance_after: number;
  reason: string | null;
  reference: {
    type: string;
    id: number | null;
  };
  created_at: string | null;
}

export interface LoyaltyHistoryData {
  transactions: LoyaltyTransaction[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AiChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiAvailableSlot {
  start_time: string;
  end_time: string;
  price: number;
}

export interface AiSearchResult {
  venue_id: number;
  venue_name: string;
  court_id: number;
  court_name: string;
  sport: string | null;
  price: number;
  rating: number;
  available_slots: AiAvailableSlot[];
  date: string;
  slug: string;
  address: string;
}

export interface AiChatData {
  type: 'search_results' | 'knowledge' | 'clarification' | 'message' | 'help';
  message?: string;
  answer?: string;
  sources?: string[];
  results?: AiSearchResult[];
  missing_fields?: string[];
  query?: {
    sport: string;
    location: string;
    date: string;
    time_from: string;
    time_to: string;
    sort: string;
  };
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
    vouchers: {
      list: (params?: { keyword?: string; status?: string; discount_type?: string; page?: number; per_page?: number }) => {
        const query = new URLSearchParams();
        if (params?.keyword) query.set('keyword', params.keyword);
        if (params?.status) query.set('status', params.status);
        if (params?.discount_type) query.set('discount_type', params.discount_type);
        if (params?.page) query.set('page', String(params.page));
        if (params?.per_page) query.set('per_page', String(params.per_page));
        const qs = query.toString();
        return apiRequest<PaginatedData<VoucherItem>>(`/admin/vouchers${qs ? `?${qs}` : ''}`);
      },
      create: (body: Partial<VoucherItem>) =>
        apiRequest<VoucherItem>('/admin/vouchers', { method: 'POST', body: JSON.stringify(body) }),
      update: (id: number, body: Partial<VoucherItem>) =>
        apiRequest<VoucherItem>(`/admin/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id: number) =>
        apiRequest(`/admin/vouchers/${id}`, { method: 'DELETE' }),
    },
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
  },

  notifications: {
    getAll: (params?: { page?: number; per_page?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.per_page) searchParams.set('per_page', String(params.per_page));
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiRequest<NotificationListData>(`/notifications${qs}`);
    },
    markAsRead: (id: number) =>
      apiRequest<NotificationItem>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () =>
      apiRequest<{ updated_count: number; unread_count: number }>('/notifications/read-all', { method: 'PUT' }),
  },

  analytics: {
    getOwnerAnalytics: () => apiRequest<OwnerAnalyticsData>('/owner/analytics'),
    getAdminAnalytics: () => apiRequest<AdminAnalyticsData>('/admin/analytics'),
  },

  referral: {
    getMyCode: () => apiRequest<ReferralData>('/referral/my-code'),
    claim: (code: string) =>
      apiRequest<{ claim: ClaimedReferral; total_referrals: number }>('/referral/claim', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
  },

  loyalty: {
    getSummary: () => apiRequest<LoyaltySummaryData>('/loyalty/summary'),
    getHistory: (params?: { page?: number; per_page?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.per_page) searchParams.set('per_page', String(params.per_page));
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiRequest<LoyaltyHistoryData>(`/loyalty/history${qs}`);
    },
    redeem: (points: number) =>
      apiRequest('/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({ points }),
      }),
  },

  ai: {
    chat: (message: string, history: AiChatHistoryMessage[] = []) =>
      apiRequest<AiChatData>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history: history.slice(-6) }),
      }),
  },

  reviews: {
    getVenueReviews: (venueIdOrSlug: string | number, params?: { rating?: number; page?: number; per_page?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.rating) searchParams.set('rating', String(params.rating));
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.per_page) searchParams.set('per_page', String(params.per_page));
      const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return apiRequest(`/venues/${venueIdOrSlug}/reviews${qs}`);
    },
    getReviewableBookings: (venueIdOrSlug: string | number) =>
      apiRequest(`/venues/${venueIdOrSlug}/my-reviewable-bookings`),
    createReview: (body: { booking_id: number; rating: number; comment: string }) =>
      apiRequest('/reviews', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (reviewId: number, status: 'visible' | 'hidden') =>
      apiRequest(`/admin/reviews/${reviewId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
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
  },

  payments: {
    generateQr: (bookingCode: string) =>
      apiRequest<{ booking: { booking_code: string; total_price: number; payment_status: string }; payment: SepayPaymentQr }>(
        '/payments/generate-qr',
        { method: 'POST', body: JSON.stringify({ booking_code: bookingCode }) }
      ),
    getStatus: (bookingCode: string) =>
      apiRequest<{ booking_code: string; total_price: number; total_paid: number; payment_status: string; status: string; is_paid: boolean }>(
        `/payments/status/${encodeURIComponent(bookingCode)}`
      ),
  },

  vouchers: {
    validate: (code: string, totalAmount: number) =>
      apiRequest<{
        valid: boolean;
        voucher: Pick<VoucherItem, 'id' | 'code' | 'name' | 'discount_type' | 'discount_value' | 'max_discount' | 'min_order_value'>;
        total_amount: number;
        discount_amount: number;
        final_amount: number;
        message?: string;
      }>('/vouchers/validate', {
        method: 'POST',
        body: JSON.stringify({ code, total_amount: totalAmount }),
      }),
  },

  matches: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
      return apiRequest<PaginatedData<MatchPostItem>>(`/matches${qs}`);
    },
    get: (id: number) => apiRequest<MatchPostItem>(`/matches/${id}`),
    create: (body: Record<string, unknown>) =>
      apiRequest<MatchPostItem>('/matches', { method: 'POST', body: JSON.stringify(body) }),
    join: (id: number, message?: string) =>
      apiRequest(`/matches/${id}/join`, { method: 'POST', body: JSON.stringify({ message }) }),
    leave: (id: number) =>
      apiRequest(`/matches/${id}/leave`, { method: 'POST' }),
    accept: (matchId: number, memberId: number) =>
      apiRequest(`/matches/${matchId}/members/${memberId}/accept`, { method: 'PUT' }),
    reject: (matchId: number, memberId: number) =>
      apiRequest(`/matches/${matchId}/members/${memberId}/reject`, { method: 'PUT' }),
    myCreated: (params?: { page?: number; per_page?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.per_page) query.set('per_page', String(params.per_page));
      const qs = query.toString();
      return apiRequest<PaginatedData<MatchPostItem>>(`/my-matches/created${qs ? `?${qs}` : ''}`);
    },
    myJoined: (params?: { page?: number; per_page?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.per_page) query.set('per_page', String(params.per_page));
      const qs = query.toString();
      return apiRequest<PaginatedData<{ id: number; status: string; match_post: MatchPostItem }>>(`/my-matches/joined${qs ? `?${qs}` : ''}`);
    },
  }
};
