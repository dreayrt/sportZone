import { getStoredToken } from "./api";
export interface Sport {
  id: number;
  code: string;
  name: string;
  description?: string;
  banner_image?: string;
  courts_count?: number;
}
export interface Amenity {
  id: number;
  name: string;
  icon?: string;
}
export interface Court {
  id: number;
  venue_id: number;
  sport_category_id: number;
  sport_category?: Sport;
  code: string;
  name: string;
  surface_type: string;
  indoor: boolean;
  capacity?: number;
  hourly_rate_standard: number;
  hourly_rate_peak: number;
  peak_start: string;
  peak_end: string;
  min_booking_minutes: number;
  slot_minutes: number;
  description?: string;
  image?: string;
  status: string;
}
export interface Venue {
  id: number;
  owner_id: number;
  code: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  ward?: string;
  district: string;
  city: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone: string;
  email?: string;
  open_time: string;
  close_time: string;
  rating: number | string;
  review_count: number;
  image?: string;
  gallery?: string[];
  status: string;
  amenities?: Amenity[];
  courts?: Court[];
  min_price?: number | null;
  distance_km?: number;
  booking_count?: number;
}
export interface Addon {
  id: number;
  venue_id: number;
  code: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock_quantity?: number;
  image?: string;
  status: string;
}
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
export interface Filters {
  locations: { city: string; district: string }[];
  sports: Sport[];
}
export interface Slots {
  court_id: number;
  date: string;
  min_booking_minutes: number;
  slots: { start: string; end: string; available: boolean }[];
}
export async function venueRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const token = getStoredToken();
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"}${path}`,
    {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(!multipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body:
        body === undefined
          ? undefined
          : multipart
            ? (body as FormData)
            : JSON.stringify(body),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(
      [data.message, ...Object.values(data.errors || {}).flat()]
        .filter(Boolean)
        .join(" "),
    );
  return data.data as T;
}
export function queryString(values: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined && v !== "all")
      params.set(k, String(v));
  });
  return params.toString();
}
export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
