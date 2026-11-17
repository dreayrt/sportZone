"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { BookingQrScanner } from "@/components/bookings/BookingQrScanner";
import { OwnerBookingForm } from "@/components/bookings/OwnerBookingForm";
import { OwnerModal } from "@/components/bookings/OwnerModal";
import {
  Notice,
  inputClass,
  buttonClass,
  secondaryClass,
} from "@/components/venues/Shared";
import { Addon, Venue, queryString, venueRequest } from "@/lib/venues-api";
import {
  OwnerBooking,
  BookingStatus,
  statusLabels,
  paymentLabels,
  downloadBookings,
  ownerBookingRequest,
} from "@/lib/owner-api";
import { formatVND, formatDate } from "@/lib/utils";
import { SepayPaymentQr } from "@/lib/api";
import { useOwnerVenue } from "@/context/OwnerVenueContext";

const emptyFilters = {
  search: "",
  date: "",
  court_id: "",
  status: "",
  payment_status: "",
};

const checkInButtonClass =
  "rounded-xl bg-sport-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-sport-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sport-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

const dangerButtonClass = `${secondaryClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60`;
const editButtonClass = `${secondaryClass} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/60`;
const calendarButtonClass = `${secondaryClass} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-950/60`;

const statusBadgeClass = "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-4 ring-1 ring-inset";
const bookingStatusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  no_show: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
};
const paymentStatusColors: Record<OwnerBooking["payment_status"], string> = {
  unpaid: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
  partial: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  refunded: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
};

export default function OwnerBookingsPage() {
  const { venueId } = useOwnerVenue();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detail, setDetail] = useState<OwnerBooking | null>(null);
  const [qr, setQr] = useState<SepayPaymentQr | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonId, setAddonId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addonMode, setAddonMode] = useState<"add" | "edit">("add");
  const addonFormRef = useRef<HTMLFormElement>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const [v, b] = await Promise.all([
        venueRequest<Venue[]>("/owner/venues"),
        venueRequest<OwnerBooking[]>(
          `/bookings?${queryString({ ...applied, venue_id: venueId })}`,
        ),
      ]);
      if (id === requestId.current) {
        setVenues(v.filter((venue) => String(venue.id) === venueId));
        setBookings(b);
      }
    } catch (e) {
      if (id === requestId.current) {
        setBookings([]);
        setError(e instanceof Error ? e.message : "Không tải được danh sách.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [applied, venueId]);
  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [load]);

  const openDetail = async (id: number | string) => {
    setQr(null);
    setBusy(true);
    setError("");
    try {
      const booking = await ownerBookingRequest(id);
      if (String(booking.venue_id) !== venueId)
        throw new Error(
          "Đơn này thuộc cơ sở khác. Hãy chọn đúng cơ sở đang quản lý.",
        );
      const items = await venueRequest<Addon[]>(
        `/owner/addons?venue_id=${booking.venue_id}`,
      );
      setDetail(booking);
      setAddons(items.filter((a) => a.status === "active"));
      setAddonId("");
      setQuantity(1);
      setAddonMode("add");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("booking");
    if (code) void openDetail(code);
  }, []);

  async function action(path: string, method = "POST", body?: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await venueRequest(path, method, body);
      if (detail) {
        setDetail(await ownerBookingRequest(detail.id));
        setAddons(
          (
            await venueRequest<Addon[]>(
              `/owner/addons?venue_id=${detail.venue_id}`,
            )
          ).filter((a) => a.status === "active"),
        );
      }
      setQr(null);
      setMessage("Đã lưu thay đổi.");
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function changeStatus(status: BookingStatus) {
    if (!detail) return;
    if (
      confirm(
        `Xác nhận chuyển đơn ${detail.booking_code} sang “${statusLabels[status]}”?`,
      )
    ) {
      void action(`/bookings/${detail.id}`, "PUT", { status });
    }
  }

  async function scan(code: string) {
    setScanning(false);
    setBusy(true);
    setError("");
    try {
      const booking = await ownerBookingRequest(code.trim().toUpperCase());
      if (String(booking.venue_id) !== venueId)
        throw new Error(
          "Mã QR thuộc cơ sở khác. Hãy chọn đúng cơ sở trước khi check-in.",
        );
      await venueRequest(`/bookings/${booking.id}/check-in`, "POST");
      setMessage(`Đã check-in đơn ${booking.booking_code}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không check-in được đơn.");
    } finally {
      setBusy(false);
    }
  }

  const courts = venues.flatMap((v) => v.courts || []);
  const editable =
    detail && !["cancelled", "completed", "no_show"].includes(detail.status);
  const selectedAddon = addons.find((addon) => String(addon.id) === addonId);
  const existingAddon = detail?.booking_addons?.find((addon) => String(addon.addon_id) === addonId);
  const maxAddonQuantity = selectedAddon?.stock_quantity == null ? undefined
    : selectedAddon.stock_quantity + (addonMode === "edit" ? existingAddon?.quantity || 0 : 0);
  const collectedAmount = detail?.payments?.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  const outstandingAmount = Math.max(0, Number(detail?.total_price || 0) - collectedAmount);
  const canCheckIn = (b: OwnerBooking) => {
    const date = b.booking_date.slice(0, 10);
    const now = currentTime;
    return (
      b.status === "confirmed" &&
      b.payment_status === "paid" &&
      !b.checked_in &&
      now >= new Date(`${date}T${b.start_time}+07:00`).getTime() - 15 * 60000 &&
      now < new Date(`${date}T${b.end_time}+07:00`).getTime()
    );
  };

  const checkInHint = (b: OwnerBooking) => {
    if (b.checked_in) return "Đơn này đã check-in.";
    if (b.status !== "confirmed") return "Đơn phải được xác nhận để check-in.";
    if (b.payment_status !== "paid") return "Cần thanh toán đủ trước khi check-in.";
    const date = b.booking_date.slice(0, 10);
    if (currentTime >= new Date(`${date}T${b.end_time}+07:00`).getTime())
      return "Đã hết thời gian check-in.";
    return canCheckIn(b)
      ? "Khách có thể check-in ngay."
      : "Check-in mở từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc.";
  };

  useEffect(() => {
    if (!qr || !detail) return;
    const id = detail.id;
    const timer = setInterval(async () => {
      if (document.hidden || busy) return;
      try {
        const booking = await ownerBookingRequest(id);
        setDetail((current) => (current?.id === id ? booking : current));
        if (booking.payment_status === "paid" || booking.status === "cancelled")
          setQr(null);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Không cập nhật được thanh toán.",
        );
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [qr, detail?.id, busy]);

  return (
    <div>
      <DashboardHeader
        title="Đơn đặt & Check-in"
        description="Quản lý đơn, thanh toán tại quầy và lịch sử giao dịch của cơ sở."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className={secondaryClass}
              disabled={busy}
              onClick={() => setScanning(true)}
            >
              Quét QR
            </button>
            <button
              className={buttonClass}
              disabled={
                busy ||
                loading ||
                !venues.some(
                  (v) =>
                    v.status === "active" &&
                    v.courts?.some((c) => c.status === "active"),
                )
              }
              onClick={() => setCreating(true)}
            >
              Tạo đơn tại quầy
            </button>
          </div>
        }
      />
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        <form
          className="grid gap-3 rounded-xl border bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied({ ...filters });
          }}
        >
          <label className="text-sm">
            Tìm kiếm
            <input
              className={inputClass}
              placeholder="Mã đơn, tên hoặc số điện thoại"
              maxLength={120}
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            Ngày
            <input
              className={inputClass}
              type="date"
              value={filters.date}
              onChange={(e) =>
                setFilters((f) => ({ ...f, date: e.target.value }))
              }
            />
          </label>
          <label className="text-sm">
            Sân
            <select
              className={inputClass}
              value={filters.court_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, court_id: e.target.value }))
              }
            >
              <option value="">Tất cả sân</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Trạng thái
            <select
              className={inputClass}
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Thanh toán
            <select
              className={inputClass}
              value={filters.payment_status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, payment_status: e.target.value }))
              }
            >
              <option value="">Tất cả thanh toán</option>
              {Object.entries(paymentLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
            <button className={buttonClass} disabled={loading || busy}>
              Lọc
            </button>
            <button
              type="button"
              className={secondaryClass}
              disabled={busy}
              onClick={() => {
                setFilters(emptyFilters);
                setApplied({ ...emptyFilters });
              }}
            >
              Xóa lọc
            </button>
            <button
              type="button"
              className={secondaryClass}
              disabled={busy || loading}
              onClick={() => void load()}
            >
              Làm mới
            </button>
            <button
              type="button"
              className={secondaryClass}
              disabled={busy || loading}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await downloadBookings({ ...applied, venue_id: venueId });
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Không xuất được báo cáo.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xuất CSV
            </button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            {loading ? "Đang tải…" : `${bookings.length} đơn phù hợp`}
          </span>
          <button
            className={secondaryClass}
            disabled={busy || loading}
            onClick={() => {
              if (
                confirm(
                  "Hủy các đơn chờ thanh toán QR hoặc đơn cũ còn chờ xử lý quá 30 phút tại cơ sở đang chọn?",
                )
              )
                void action(
                  `/owner/bookings/cancel-unpaid?minutes=30&venue_id=${venueId}`,
                );
            }}
          >
            Hủy đơn quá hạn 30 phút
          </button>
          <button
            className={secondaryClass}
            disabled={busy || loading}
            onClick={() => {
              if (
                confirm(
                  "Quét và chuyển các đơn đã hết giờ thi đấu mà chưa check-in thành 'Khách không đến' tại cơ sở đang chọn?",
                )
              )
                void action(
                  `/owner/bookings/mark-no-shows?venue_id=${venueId}`,
                );
            }}
          >
            Quét đơn khách không đến
          </button>
        </div>
        {loading ? (
          <Notice>Đang tải đơn đặt…</Notice>
        ) : bookings.length === 0 ? (
          <Notice>
            {error
              ? "Chưa tải được danh sách. Hãy thử làm mới."
              : "Chưa có đơn đặt phù hợp."}
          </Notice>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                <tr>
                  {[
                    "Mã đơn / Cơ sở",
                    "Khách hàng",
                    "Sân / Thời gian",
                    "Tổng tiền",
                    "Trạng thái",
                    "Thao tác",
                  ].map((h) => (
                    <th key={h} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t dark:border-neutral-800">
                    <td className="p-3">
                      <button
                        className="font-semibold text-sport-600 underline"
                        disabled={busy}
                        onClick={() => void openDetail(b.id)}
                      >
                        {b.booking_code}
                      </button>
                      <div className="mt-1 text-xs text-neutral-500">
                        {b.venue?.name} ·{" "}
                        {b.source === "website" ? "Website" : "Tại quầy"}
                      </div>
                    </td>
                    <td className="p-3">
                      {b.customer_name}
                      <div className="text-xs text-neutral-500">
                        {b.customer_phone}
                      </div>
                    </td>
                    <td className="p-3">
                      {b.court?.name}
                      <div className="whitespace-nowrap text-xs text-neutral-500">
                        {formatDate(b.booking_date)} ·{" "}
                        {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      </div>
                    </td>
                    <td className="p-3 font-semibold">
                      {formatVND(b.total_price)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-2">
                        {!["pending", "confirmed"].includes(b.status) && <span className={`${statusBadgeClass} ${bookingStatusColors[b.status]}`}>
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                          {statusLabels[b.status]}
                        </span>}
                        <span className={`${statusBadgeClass} ${paymentStatusColors[b.payment_status]}`}>
                          {paymentLabels[b.payment_status]}
                        </span>
                        {b.checked_in && <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Đã check-in</span>}
                      </div>
                      {b.status === "cancelled" &&
                        ["paid", "partial"].includes(b.payment_status) && (
                          <span className="text-xs text-amber-600">
                            Cần xử lý hoàn tiền
                          </span>
                        )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={secondaryClass}
                          disabled={busy}
                          onClick={() => void openDetail(b.id)}
                        >
                          Chi tiết
                        </button>
                        <button
                          className={checkInButtonClass}
                          disabled={busy || !canCheckIn(b)}
                          title={checkInHint(b)}
                          onClick={() =>
                            void action(`/bookings/${b.id}/check-in`)
                          }
                        >
                          {b.checked_in ? "Đã check-in" : "Check-in"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && (
        <OwnerBookingForm
          venues={venues}
          onClose={() => setCreating(false)}
          onSaved={(b) => {
            setCreating(false);
            setMessage(`Đã tạo đơn ${b.booking_code}.`);
            void load();
          }}
        />
      )}
      {scanning && (
        <BookingQrScanner
          onClose={() => setScanning(false)}
          onScan={(code) => void scan(code)}
        />
      )}
      {detail && (
        <OwnerModal onClose={() => setDetail(null)} busy={busy}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
            className="max-h-[90dvh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-2xl bg-white p-5 font-sans text-sm leading-6 text-neutral-700 shadow-2xl dark:bg-neutral-900 dark:text-neutral-300 sm:p-6 [&_input]:mt-1.5 [&_select]:mt-1.5 [&_label]:font-medium [&_button:disabled]:cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-neutral-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sport-600">Chi tiết đặt sân</p>
                <h2 id="booking-detail-title" className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Đơn {detail.booking_code}
                </h2>
              </div>
              <button
                disabled={busy}
                className={secondaryClass}
                onClick={() => setDetail(null)}
              >
                Đóng
              </button>
            </div>
            {error && <Notice error>{error}</Notice>}
            {message && <Notice>{message}</Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <div>
                  <p className="text-xs text-neutral-500">Khách hàng</p>
                  <p className="mt-1 font-semibold text-neutral-900 dark:text-white">{detail.customer_name}</p>
                  <p className="text-sm text-neutral-500">{detail.customer_phone}{detail.customer_email && ` · ${detail.customer_email}`}</p>
                </div>
                <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <p className="font-medium text-neutral-900 dark:text-white">{detail.court?.name}</p>
                  <p className="text-xs text-neutral-500">{detail.venue?.name}</p>
                  <p className="mt-2 font-medium tabular-nums">{formatDate(detail.booking_date)} · {detail.start_time.slice(0, 5)}–{detail.end_time.slice(0, 5)}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  {!["pending", "confirmed"].includes(detail.status) && <span className={`${statusBadgeClass} ${bookingStatusColors[detail.status]}`}>{statusLabels[detail.status]}</span>}
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{detail.checked_in ? "Đã check-in" : "Chưa check-in"}</span>
                </div>
              </div>
              <div className="rounded-xl border border-sport-100 bg-sport-50/40 p-4 dark:border-sport-900 dark:bg-sport-950/20">
                <h3 className="mb-3 font-semibold text-neutral-900 dark:text-white">Thanh toán</h3>
                <dl className="space-y-2 tabular-nums">
                  <div className="flex justify-between gap-3"><dt className="text-neutral-500">Tiền sân</dt><dd>{formatVND(detail.court_fee)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-neutral-500">Dịch vụ</dt><dd>{formatVND(detail.addons_fee)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-neutral-500">Giảm giá</dt><dd>{formatVND(detail.discount_amount)}</dd></div>
                  <div className="flex justify-between gap-3 border-t border-sport-100 pt-3 font-semibold dark:border-sport-900"><dt>Tổng tiền</dt><dd className="text-lg text-sport-700 dark:text-sport-400">{formatVND(detail.total_price)}</dd></div>
                </dl>
                <p className={`mt-3 text-xs font-medium ${detail.payment_status === "paid" ? "text-sport-700 dark:text-sport-400" : "text-amber-700 dark:text-amber-400"}`}>{paymentLabels[detail.payment_status]}</p>
                {detail.payment_status === "partial" && <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-400">Cần thu thêm: {formatVND(outstandingAmount)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
            <p className="min-w-0 break-words text-sm text-neutral-500">
              Ghi chú: {detail.note || "Không có"}
              {detail.cancel_reason && (
                <>
                  <br />
                  Lý do hủy: {detail.cancel_reason}
                </>
              )}
            </p>
            {editable && <button type="button" className={`${editButtonClass} shrink-0`} disabled={busy} onClick={() => {
              const note = prompt("Cập nhật ghi chú (tối đa 500 ký tự):", detail.note || "");
              if (note !== null) void action(`/bookings/${detail.id}`, "PUT", { note });
            }}>Sửa ghi chú</button>}
            </div>
            {editable && (
              <details className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                <summary className="cursor-pointer text-sm font-semibold text-neutral-800 outline-none focus-visible:ring-2 focus-visible:ring-sport-500 dark:text-neutral-100">
                  Sửa thông tin khách hàng
                </summary>
                <form
                  key={detail.id}
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const values = new FormData(e.currentTarget);
                    void action(`/bookings/${detail.id}`, "PUT", {
                      customer_name: values.get("customer_name"),
                      customer_phone: values.get("customer_phone"),
                      customer_email: values.get("customer_email") || null,
                    });
                  }}
                >
                  <label className="text-sm">
                    Tên khách
                    <input
                      name="customer_name"
                      required
                      maxLength={120}
                      defaultValue={detail.customer_name}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm">
                    Số điện thoại
                    <input
                      name="customer_phone"
                      required
                      type="tel"
                      maxLength={20}
                      defaultValue={detail.customer_phone}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm">
                    Email
                    <input
                      name="customer_email"
                      type="email"
                      maxLength={150}
                      defaultValue={detail.customer_email || ""}
                      className={inputClass}
                    />
                  </label>
                  <button className={`${buttonClass} self-end justify-self-start`} disabled={busy}>
                    Lưu thông tin khách
                  </button>
                </form>
              </details>
            )}
            <div className="flex flex-wrap gap-2">
            <button
              className={secondaryClass}
              disabled={busy}
              onClick={() => void openDetail(detail.id)}
            >
              Làm mới thông tin đơn
            </button>
            <a
              className={`${calendarButtonClass} inline-flex`}
              href={`/dashboard/owner/calendar?date=${detail.booking_date.slice(0, 10)}&court=${detail.court_id}`}
            >
              Xem trên lịch sân
            </a>
            </div>
            <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Thao tác đơn</h3>
              <div className="flex flex-wrap items-center gap-2">
              {editable &&
                detail.payment_status !== "paid" &&
                detail.payment_method !== "vietqr" && (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Bạn đã nhận đủ số tiền còn thiếu từ khách?"))
                        void action(`/bookings/${detail.id}`, "PUT", {
                          payment_status: "paid",
                        });
                    }}
                  >
                    Đã thu đủ tiền tại quầy
                  </button>
                )}
              {editable &&
                detail.payment_method === "vietqr" &&
                detail.payment_status !== "paid" && (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const result = await venueRequest<{
                          payment: SepayPaymentQr;
                        }>("/payments/generate-qr", "POST", {
                          booking_code: detail.booking_code,
                        });
                        setQr(result.payment);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Không tạo được QR.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Mở mã thanh toán QR
                  </button>
                )}
              <button
                className={checkInButtonClass}
                disabled={busy || !canCheckIn(detail)}
                title={checkInHint(detail)}
                onClick={() => void action(`/bookings/${detail.id}/check-in`)}
              >
                {detail.checked_in ? "Đã check-in" : "Check-in"}
              </button>
              {detail.status === "confirmed" &&
                detail.checked_in &&
                detail.payment_status === "paid" && (
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => changeStatus("completed")}
                  >
                    Hoàn thành
                  </button>
                )}
              {editable &&
                !detail.checked_in &&
                new Date(
                  `${detail.booking_date.slice(0, 10)}T${detail.end_time}`,
                ).getTime() <= Date.now() && (
                  <button
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() => changeStatus("no_show")}
                  >
                    Khách không đến
                  </button>
                )}
              {editable && !detail.checked_in && (
                <button
                  className={dangerButtonClass}
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt("Lý do hủy đơn (tối đa 255 ký tự):");
                    if (reason?.trim())
                      void action(`/bookings/${detail.id}/cancel`, "POST", {
                        reason: reason.trim(),
                      });
                  }}
                >
                  Hủy đơn
                </button>
              )}
              {detail.status === "cancelled" &&
                ["paid", "partial"].includes(detail.payment_status) && (
                  <button
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() => {
                      const note = prompt(
                        "Chỉ xác nhận sau khi đã trả tiền cho khách. Nhập thông tin hoàn tiền (tiền mặt / mã chuyển khoản):",
                      );
                      if (note?.trim())
                        void action(`/bookings/${detail.id}/refund`, "POST", {
                          note: note.trim(),
                        });
                    }}
                  >
                    Ghi nhận đã hoàn tiền thủ công
                  </button>
                )}
              </div>
              {editable && detail.payment_method === "vietqr" && detail.payment_status !== "paid" && <p className="border-t border-neutral-100 pt-3 text-xs leading-5 text-neutral-500 dark:border-neutral-800">Thanh toán sẽ tự cập nhật khi SePay ghi nhận giao dịch. Không cần xác nhận đơn thủ công.</p>}
            </section>
            {qr && (
              <section className="rounded-xl border p-4 dark:border-neutral-700">
                <h3 className="font-semibold">
                  Thanh toán {formatVND(qr.amount)}
                </h3>
                <img
                  src={qr.qr_image_url}
                  alt={`Mã QR thanh toán đơn ${detail.booking_code}`}
                  className="mx-auto my-3 max-h-72 max-w-full"
                />
                <p className="text-sm">
                  {qr.bank_name} · {qr.account_no} · {qr.account_name}
                  <br />
                  Nội dung: <strong>{qr.transfer_content}</strong>
                  <br />
                  Hết hạn: {new Date(qr.expires_at).toLocaleString("vi-VN")}
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Tự cập nhật trạng thái mỗi 15 giây. Có thể làm mới thông tin
                  đơn sau khi khách chuyển khoản.
                </p>
              </section>
            )}
            <section className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-neutral-900 dark:text-white">Dịch vụ trong đơn</h3>
                {editable && <button type="button" disabled={busy || !addons.length} className={buttonClass} onClick={() => {
                  setAddonMode("add"); setAddonId(""); setQuantity(1);
                  addonFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  addonFormRef.current?.querySelector("select")?.focus();
                }}>+ Thêm dịch vụ</button>}
              </div>
              {detail.booking_addons?.length ? (
                detail.booking_addons.map((a) => (
                  <div
                    key={a.addon_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50"
                  >
                    <span>
                      {a.addon_name} × {a.quantity} · {formatVND(a.total_price)}
                    </span>
                    {editable && (
                      <div className="flex gap-2">
                        <button
                          className={editButtonClass}
                          disabled={busy}
                          onClick={() => {
                            setAddonId(String(a.addon_id));
                            setQuantity(a.quantity);
                            setAddonMode("edit");
                            addonFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                          }}
                        >
                          Sửa số lượng
                        </button>
                        <button
                          className={dangerButtonClass}
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`Xóa dịch vụ ${a.addon_name}?`))
                              void action(
                                `/bookings/${detail.id}/addons/${a.addon_id}`,
                                "DELETE",
                              );
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-500">Chưa có dịch vụ.</p>
              )}
              {editable && (
                <form
                  ref={addonFormRef}
                  className="space-y-3 rounded-xl border border-sport-100 bg-sport-50/40 p-4 dark:border-sport-900 dark:bg-sport-950/20"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (busy || !selectedAddon || !Number.isInteger(quantity) || quantity < 1 || (maxAddonQuantity != null && quantity > maxAddonQuantity)) return;
                    const saved = await action(`/bookings/${detail.id}/addons`, "POST", {
                      addon_id: Number(addonId),
                      quantity: addonMode === "edit" ? quantity : quantity + (existingAddon?.quantity || 0),
                    });
                    if (saved) { setAddonMode("add"); setAddonId(""); setQuantity(1); }
                  }}
                >
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{addonMode === "edit" ? "Cập nhật số lượng dịch vụ" : "Thêm dịch vụ cho khách"}</h4>
                  <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
                  <label className="min-w-0 text-xs text-neutral-500">
                    Dịch vụ
                  <select
                    aria-label="Chọn dịch vụ"
                    className={inputClass}
                    required
                    disabled={busy || addonMode === "edit"}
                    value={addonId}
                    onChange={(e) => { setAddonId(e.target.value); setQuantity(1); }}
                  >
                    <option value="">Chọn dịch vụ</option>
                    {addons.map((a) => (
                      <option key={a.id} value={a.id} disabled={addonMode === "add" && a.stock_quantity === 0}>
                        {a.name} · {formatVND(a.price)}
                        {a.stock_quantity != null &&
                          ` · Còn ${a.stock_quantity}`}
                      </option>
                    ))}
                  </select>
                  </label>
                  <label className="text-xs text-neutral-500">
                    {addonMode === "edit" ? "Tổng số lượng" : "Số lượng thêm"}
                  <input
                    aria-label="Số lượng dịch vụ"
                    className={inputClass}
                    required
                    type="number"
                    min={1}
                    step={1}
                    max={maxAddonQuantity}
                    disabled={busy}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                  </label>
                  <button className={buttonClass} disabled={busy || !selectedAddon || quantity < 1 || !Number.isInteger(quantity) || (maxAddonQuantity != null && quantity > maxAddonQuantity)}>
                    {busy ? "Đang lưu…" : addonMode === "edit" ? "Lưu số lượng" : "Thêm vào đơn"}
                  </button>
                  </div>
                  {selectedAddon && <p className="text-xs text-neutral-500">
                    {addonMode === "add" ? <>Tiền dịch vụ thêm: <strong className="text-sport-700 dark:text-sport-400">{formatVND(selectedAddon.price * quantity)}</strong>{existingAddon && ` · Đã có ${existingAddon.quantity}, sau khi thêm: ${existingAddon.quantity + quantity}`}</> : `Đang sửa tổng số lượng của ${selectedAddon.name}.`}
                  </p>}
                  <p className="text-xs text-neutral-500">Tổng tiền và tồn kho tự cập nhật sau khi lưu. Nếu đã thanh toán, phần phát sinh sẽ cần thu thêm.</p>
                  {addonMode === "edit" && <button type="button" className={secondaryClass} disabled={busy} onClick={() => { setAddonMode("add"); setAddonId(""); setQuantity(1); }}>Hủy chỉnh sửa</button>}
                  {!addons.length && <p className="text-xs text-amber-700 dark:text-amber-400">Cơ sở chưa có dịch vụ đang hoạt động. Hãy thêm dịch vụ trong mục quản lý dịch vụ trước.</p>}
                </form>
              )}
            </section>
            <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="font-semibold">Giao dịch</h3>
              {detail.payments?.length ? (
                detail.payments.map((p) => (
                  <p key={p.id} className="break-words rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-6 dark:bg-neutral-800/50">
                    {formatVND(p.amount)} · {p.method} ·{" "}
                    {p.status === "refunded"
                      ? "Đã hoàn"
                      : p.status === "paid"
                        ? "Đã thu"
                        : p.status}{" "}
                    · {p.transaction_code || "Không có mã"}
                    {p.paid_at &&
                      ` · ${new Date(p.paid_at).toLocaleString("vi-VN")}`}
                  </p>
                ))
              ) : (
                <p className="text-sm text-neutral-500">
                  Chưa có giao dịch được ghi nhận.
                </p>
              )}
            </section>
            <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <h3 className="font-semibold">Lịch sử xử lý</h3>
              {detail.status_histories?.map((h) => (
                <p
                  key={h.id}
                  className="border-l-2 border-sport-500 pl-3 text-sm"
                >
                  <span className="text-xs text-neutral-500">
                    {new Date(h.created_at).toLocaleString("vi-VN")}
                  </span>
                  <br />
                  {h.note || statusLabels[h.new_status]}
                </p>
              ))}
            </section>
          </section>
        </OwnerModal>
      )}
    </div>
  );
}
