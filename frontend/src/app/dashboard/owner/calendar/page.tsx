"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock3,
  CheckCircle2,
  Users,
  ArrowUpRight,
  Phone,
} from "lucide-react";
import { useOwnerVenue } from "@/context/OwnerVenueContext";
import { OwnerBookingForm } from "@/components/bookings/OwnerBookingForm";
import {
  Notice,
  inputClass,
  buttonClass,
  secondaryClass,
} from "@/components/venues/Shared";
import { Court, localDate, venueRequest } from "@/lib/venues-api";
import {
  statusLabels,
  paymentLabels,
  BookingStatus,
  PaymentStatus,
} from "@/lib/owner-api";
import { formatVND } from "@/lib/utils";

interface TimelineSlot {
  is_booked: boolean;
  available: boolean;
  is_peak: boolean;
  booking_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  checked_in: boolean;
  status: BookingStatus;
  payment_status: PaymentStatus;
  start_time: string | null;
  end_time: string | null;
}
interface Timeline {
  courts: Court[];
  matrix: { hour: string; end: string; slots: Record<number, TimelineSlot> }[];
}

export default function OwnerCalendarPage() {
  const { venue, venueId } = useOwnerVenue();
  const [date, setDate] = useState(localDate());
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(Boolean(venueId));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [form, setForm] = useState<{ courtId?: number; start?: string } | null>(
    null,
  );
  const requestId = useRef(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get("date");
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate))
      setDate(requestedDate);
    if (params.get("court")) setCourtFilter(params.get("court") || "");
  }, []);
  const load = useCallback(
    async (quiet = false) => {
      if (!venueId || !date) return;
      const id = ++requestId.current;
      if (!quiet) setLoading(true);
      setError("");
      try {
        const data = await venueRequest<Timeline>(
          `/owner/calendar?venue_id=${venueId}&date=${date}`,
        );
        if (id === requestId.current) setTimeline(data);
      } catch (e) {
        if (id === requestId.current) {
          setTimeline(null);
          setError(e instanceof Error ? e.message : "Không tải được lịch.");
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [venueId, date],
  );
  useEffect(() => {
    setTimeline(null);
    void load();
    return () => {
      requestId.current++;
    };
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!form && !document.hidden) void load(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [load, form]);
  const shift = (days: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    setDate(
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    );
  };
  const courts =
    timeline?.courts.filter(
      (c) => !courtFilter || String(c.id) === courtFilter,
    ) || [];
  const bookings = new Map<string, TimelineSlot>();
  timeline?.matrix.forEach((row) =>
    courts.forEach((court) => {
      const slot = row.slots[court.id];
      if (slot?.booking_code) bookings.set(slot.booking_code, slot);
    }),
  );
  const entries = Array.from(bookings.values());
  const prettyDate = new Date(`${date}T12:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sport-600">
            <CalendarDays className="h-4 w-4" />
            Lịch vận hành
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Lưới lịch sân
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {venue?.name || "Chọn cơ sở để bắt đầu"} · Theo dõi lịch đặt và nhận
            khách tại quầy.
          </p>
        </div>
        <button
          className={`${buttonClass} flex items-center gap-2 shadow-sm`}
          disabled={
            loading ||
            venue?.status !== "active" ||
            !timeline?.courts.some((c) => c.status === "active")
          }
          onClick={() => setForm({})}
        >
          <Plus className="h-4 w-4" />
          Tạo đơn tại quầy
        </button>
      </div>
      {error && (
        <Notice error>
          {error}{" "}
          <button className="ml-2 underline" onClick={() => void load()}>
            Thử lại
          </button>
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Sân đang hiển thị",
            value: courts.length,
            icon: CalendarDays,
            tone: "text-sport-600 bg-sport-50 dark:bg-sport-950",
          },
          {
            label: "Đơn đặt trong ngày",
            value: bookings.size,
            icon: Users,
            tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
          },
          {
            label: "Chưa thanh toán đủ",
            value: entries.filter((b) => b.payment_status !== "paid").length,
            icon: Clock3,
            tone: "text-amber-600 bg-amber-50 dark:bg-amber-950",
          },
          {
            label: "Đã check-in",
            value: entries.filter((b) => b.checked_in).length,
            icon: CheckCircle2,
            tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div>
              <p className="text-xs font-medium text-neutral-500">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {loading ? "—" : stat.value}
              </p>
            </div>
            <span className={`rounded-xl p-2.5 ${stat.tone}`}>
              <stat.icon className="h-5 w-5" strokeWidth={1.7} />
            </span>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              aria-label="Ngày trước"
              className={`${secondaryClass} p-2.5`}
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              aria-label="Ngày xem lưới lịch"
              type="date"
              className={`${inputClass} !w-40 font-semibold`}
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <button
              aria-label="Ngày sau"
              className={`${secondaryClass} p-2.5`}
              onClick={() => shift(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              className={secondaryClass}
              onClick={() => setDate(localDate())}
            >
              Hôm nay
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc sân trong lịch"
              className={`${inputClass} !w-auto max-w-xs`}
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
            >
              <option value="">Tất cả sân</option>
              {timeline?.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              aria-label="Làm mới lịch"
              className={secondaryClass}
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/70 px-4 py-3 text-xs dark:bg-neutral-950/30">
          <p className="font-medium text-neutral-600 dark:text-neutral-400">
            {prettyDate}
            {venue &&
              ` · ${venue.open_time.slice(0, 5)}–${venue.close_time.slice(0, 5)}`}
          </p>
          <div className="flex flex-wrap gap-4">
            {[
              ["bg-emerald-500", "Còn trống"],
              ["bg-amber-400", "Chưa thu đủ"],
              ["bg-indigo-500", "Đã thanh toán"],
              ["bg-emerald-500", "Đã check-in"],
              ["bg-slate-300", "Đã qua giờ"],
              ["bg-rose-400", "Bảo trì / Đóng cửa"],
            ].map(([color, label]) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-neutral-500"
              >
                <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8">
            <Notice>Đang tải lịch sân…</Notice>
          </div>
        ) : !venue ? (
          <div className="p-8">
            <Notice>
              Chưa có cơ sở.{" "}
              <Link className="underline" href="/dashboard/owner/venues">
                Thêm cơ sở
              </Link>
              .
            </Notice>
          </div>
        ) : timeline && !courts.length ? (
          <div className="p-8">
            <Notice>Chưa có sân phù hợp tại cơ sở này.</Notice>
          </div>
        ) : (
          timeline && (
            <div
              className="owner-calendar-scroll max-h-[65vh] overflow-auto pb-5"
              tabIndex={0}
              role="region"
              aria-label="Lịch sân, có thể cuộn ngang và dọc"
            >
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 w-28 border-b border-r border-neutral-200 bg-neutral-100 px-4 py-4 font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                      Khung giờ
                    </th>
                    {courts.map((c) => (
                      <th
                        key={c.id}
                        className="w-60 border-b border-r border-neutral-200 bg-neutral-50 p-4 last:border-r-0 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <p className="font-semibold text-neutral-900 dark:text-white">
                          {c.name}
                        </p>
                        <p className="mt-1.5 font-normal text-neutral-500">
                          {formatVND(c.hourly_rate_standard)}/giờ
                          {c.status !== "active" &&
                            ` · ${c.status === "maintenance" ? "Bảo trì" : "Đóng cửa"}`}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.matrix.map((row, index) => (
                    <tr key={row.hour}>
                      <th className="sticky left-0 z-10 border-b border-r border-neutral-100 bg-white px-4 py-2 font-sans font-medium tabular-nums text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                        <span>{row.hour}</span>
                        <span className="mt-1 block text-[11px] font-normal text-neutral-500">
                          {row.end}
                        </span>
                      </th>
                      {courts.map((court) => {
                        const slot = row.slots[court.id];
                        if (
                          slot?.is_booked &&
                          index > 0 &&
                          timeline.matrix[index - 1].slots[court.id]
                            ?.booking_code === slot.booking_code
                        )
                          return null;
                        let span = 1;
                        if (slot?.is_booked)
                          while (
                            index + span < timeline.matrix.length &&
                            timeline.matrix[index + span].slots[court.id]
                              ?.booking_code === slot.booking_code
                          )
                            span++;
                        const past =
                          new Date(`${date}T${row.hour}:00`).getTime() <
                          Date.now();
                        const emptyTone =
                          court.status !== "active"
                            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400"
                            : past
                              ? "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                              : slot?.available
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/60"
                                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400";
                        const color = slot?.checked_in
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : slot?.payment_status === "paid"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
                        return (
                          <td
                            key={court.id}
                            rowSpan={span}
                            className={`border-b border-r border-neutral-100 p-1.5 align-top last:border-r-0 dark:border-neutral-800 ${slot?.is_peak && !slot.is_booked ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
                          >
                            {slot?.is_booked ? (
                              <Link
                                href={`/dashboard/owner/bookings?booking=${slot.booking_code}`}
                                aria-label={`Xem đơn ${slot.booking_code}, ${slot.customer_name}, ${slot.start_time?.slice(0, 5)} đến ${slot.end_time?.slice(0, 5)}`}
                                className={`group block h-full rounded-lg border border-l-[3px] px-3 py-2 transition-shadow hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sport-500 ${color}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-1 text-xs font-bold tabular-nums tracking-tight">
                                    <Clock3 className="h-3 w-3 shrink-0 opacity-60" />
                                    {slot.start_time?.slice(0, 5)}
                                    <span className="font-normal opacity-40">–</span>
                                    {slot.end_time?.slice(0, 5)}
                                  </span>
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 transition-colors group-hover:bg-white dark:bg-white/10 dark:group-hover:bg-white/20"><ArrowUpRight className="h-3 w-3" /></span>
                                </div>
                                <p className="mt-1 truncate text-xs font-semibold text-neutral-900 dark:text-white" title={slot.customer_name || undefined}>
                                  {slot.customer_name}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {slot.customer_phone}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                  {(slot.checked_in || !["pending", "confirmed"].includes(slot.status)) && <span className="inline-flex items-center gap-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-black/5 dark:bg-white/10 dark:ring-white/10">
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{slot.checked_in
                                    ? "Đã check-in"
                                    : statusLabels[slot.status]}</span>}
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${slot.payment_status === "paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"}`}>{paymentLabels[slot.payment_status]}</span>
                                </div>
                                <p className="mt-1.5 text-[9px] font-medium tracking-wide opacity-60">Mã đơn · {slot.booking_code}</p>
                              </Link>
                            ) : (
                              <button
                                disabled={!slot?.available}
                                onClick={() =>
                                  setForm({
                                    courtId: court.id,
                                    start: row.hour,
                                  })
                                }
                                className={`group flex min-h-12 w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-default ${emptyTone}`}
                                title={
                                  slot?.available
                                    ? "Tạo đơn tại quầy từ giờ này"
                                    : "Không thể bắt đầu đặt tại khung giờ này"
                                }
                              >
                                {slot?.available ? (
                                  <>
                                    <Plus className="h-3 w-3" />
                                    Trống
                                  </>
                                ) : court.status !== "active" ? (
                                  court.status === "maintenance" ? (
                                    "Bảo trì"
                                  ) : (
                                    "Đóng cửa"
                                  )
                                ) : past ? (
                                  "Đã qua giờ"
                                ) : (
                                  "Không khả dụng"
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-400 dark:border-neutral-800">
          Chọn ô trống để đặt tại quầy · Chọn đơn để xem chi tiết · Tự cập nhật
          mỗi phút
        </div>
      </section>
      {form && venue && (
        <OwnerBookingForm
          venues={[venue]}
          initialCourtId={
            form.courtId || venue.courts?.find((c) => c.status === "active")?.id
          }
          initialDate={date}
          initialTime={form.start}
          onClose={() => setForm(null)}
          onSaved={(booking) => {
            setForm(null);
            setMessage(`Đã tạo đơn ${booking.booking_code}.`);
            void load();
          }}
        />
      )}
    </div>
  );
}
