const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors: any;
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
  }
};

