export interface AdminCategory {
  id: number; code: string; name: string; description: string | null;
  banner_image: string | null; is_active: boolean; sort_order: number;
  courts_count: number; active_courts_count: number;
}
export interface AdminSettings {
  sepay_bank_name: string; sepay_account_no: string; sepay_account_name: string;
  hotline: string; loyalty_points_per_10k: number; referral_referrer_points: number;
  referral_referred_points: number; reminder_before_minutes: number;
}
export interface AdminAuditLog {
  id: number; action: string; entity_type: string | null; entity_id: number | null;
  details: string | null; ip_address: string | null; created_at: string;
  user: { id: number; full_name: string } | null;
}

export interface MonitoredVenue {
  status_version: string;
  image?: string | null;
  rating?: number | string;
  review_count?: number;
  id: number; name: string; code: string; slug: string; address: string; district: string; city: string;
  phone: string; email?: string; open_time: string; close_time: string; status: string;
  admin_suspended_at: string | null; admin_suspension_reason: string | null;
  owner: { id: number; full_name: string; phone: string | null; email: string | null; status: string } | null;
  courts_count: number; active_courts_count: number; bookings_count: number; upcoming_bookings_count: number; paid_revenue: number | string;
  today_bookings_count: number; maintenance_courts_count: number; monthly_revenue: number | string;
  courts?: { id: number; name: string; code: string; status: string; hourly_rate_standard: number; sport_category?: { name: string } }[];
}

export interface VenueMonitoringSummary {
  total: number; active: number; suspended: number; inactive: number; pending: number;
}
