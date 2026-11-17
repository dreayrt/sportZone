import { getStoredToken } from "./api";
import { venueRequest, queryString } from "./venues-api";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export interface OwnerBooking {
  id: number;
  booking_code: string;
  venue_id: number;
  court_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  note?: string | null;
  cancel_reason?: string | null;
  source: string;
  court_fee: number;
  addons_fee: number;
  discount_amount: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  checked_in: boolean;
  checked_in_at?: string;
  venue?: { name: string };
  court?: { name: string };
  booking_addons?: {
    addon_id: number;
    addon_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  status_histories?: {
    id: number;
    note: string;
    created_at: string;
    new_status: BookingStatus;
  }[];
  payments?: {
    id: number;
    amount: number;
    method: string;
    status: string;
    paid_at: string;
    transaction_code?: string;
  }[];
}

export const statusLabels: Record<BookingStatus, string> = {
  pending: "Chờ thanh toán",
  confirmed: "Còn hiệu lực",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  no_show: "Không đến",
};
export const paymentLabels: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán đủ",
  refunded: "Đã hoàn tiền",
};

export async function downloadBookings(
  filters: Record<string, unknown>,
): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"}/owner/bookings/export?${queryString(filters)}`,
    {
      headers: {
        Accept: "text/csv",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Không thể xuất báo cáo.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `SportZone_Bookings_${filters.date || "all"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ownerBookingRequest = (id: number | string) =>
  venueRequest<OwnerBooking>(`/bookings/${encodeURIComponent(id)}`);
