"use client";

import { useEffect, useState } from "react";
import { Addon, Slots, Venue, localDate, venueRequest } from "@/lib/venues-api";
import { availableBookingTimes } from "@/lib/booking-availability";
import { OwnerBooking } from "@/lib/owner-api";
import { formatVND } from "@/lib/utils";
import { OwnerModal } from "./OwnerModal";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Coffee,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  Notice,
  inputClass,
  buttonClass,
  secondaryClass,
} from "@/components/venues/Shared";

const timeMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const timeLabel = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function OwnerBookingForm({
  venues,
  initialCourtId,
  initialDate,
  initialTime,
  onClose,
  onSaved,
}: {
  venues: Venue[];
  initialCourtId?: number;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSaved: (booking: OwnerBooking) => void;
}) {
  const initialVenue =
    venues.find((v) => v.courts?.some((c) => c.id === initialCourtId)) ||
    venues.find((v) => v.status === "active");
  const [venueId, setVenueId] = useState(String(initialVenue?.id || ""));
  const [courtId, setCourtId] = useState(
    String(
      initialCourtId ||
        initialVenue?.courts?.find((c) => c.status === "active")?.id ||
        "",
    ),
  );
  const [date, setDate] = useState(initialDate || localDate());
  const [start, setStart] = useState(initialTime || "");
  const initialCourt =
    initialVenue?.courts?.find((c) => c.id === initialCourtId) ||
    initialVenue?.courts?.find((c) => c.status === "active");
  const [end, setEnd] = useState(
    initialTime && initialCourt
      ? timeLabel(
          timeMinutes(initialTime) + Number(initialCourt.min_booking_minutes),
        )
      : "",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [paid, setPaid] = useState(false);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [error, setError] = useState("");
  const [addonError, setAddonError] = useState("");
  const [addonRetry, setAddonRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addonSearch, setAddonSearch] = useState("");
  const [calendar, setCalendar] = useState<{ key: string; data: Slots } | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [calendarRetry, setCalendarRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  const venue = venues.find((v) => String(v.id) === venueId);
  const courts = venue?.courts?.filter((c) => c.status === "active") || [];
  const court = courts.find((c) => String(c.id) === courtId);
  const calendarKey = `${courtId}:${date}`;

  useEffect(() => {
    if (!courtId || !date) return;
    const ac = new AbortController();
    let sequence = 0;
    const refresh = async () => {
      const id = ++sequence;
      setNow(Date.now());
      setCalendarLoading(true);
      setCalendarError("");
      try {
        const data = await venueRequest<Slots>(
          `/owner/courts/${courtId}/calendar?date=${date}`, "GET", undefined, ac.signal,
        );
        if (!ac.signal.aborted && id === sequence) setCalendar({ key: `${courtId}:${date}`, data });
      } catch (e) {
        if (!ac.signal.aborted && id === sequence) {
          setCalendar(null);
          setCalendarError(e instanceof Error ? e.message : "Không tải được lịch sân.");
        }
      } finally {
        if (!ac.signal.aborted && id === sequence) setCalendarLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    return () => {
      ac.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [courtId, date, calendarRetry]);

  useEffect(() => {
    if (!venueId) return;
    const ac = new AbortController();
    setLoading(true);
    setAddonError("");
    setAddons([]);
    setQuantities({});
    setAddonSearch("");
    venueRequest<Addon[]>(
      `/owner/addons?venue_id=${venueId}`,
      "GET",
      undefined,
      ac.signal,
    )
      .then((items) => setAddons(items.filter((a) => a.status === "active")))
      .catch((e) => {
        if (e.name !== "AbortError") setAddonError(e.message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [venueId, addonRetry]);

  const minutes = timeMinutes;
  const clock = timeLabel;
  const calendarReady = !!court && calendar?.key === calendarKey && !calendarError;
  const { starts, ends } = availableBookingTimes(
    calendarReady ? calendar.data.slots : [],
    Number(court?.min_booking_minutes || 30), date, now, start,
  );
  useEffect(() => {
    if (!calendarReady) return;
    if (start && !starts.includes(start)) {
      setStart("");
      setEnd("");
    } else if (end && !ends.includes(end)) {
      setEnd("");
    }
  }, [calendar, calendarReady, start, end, now]);
  const duration = start && end ? minutes(end) - minutes(start) : 0;
  const peakMinutes =
    court && start && end
      ? Math.max(
          0,
          Math.min(minutes(end), minutes(court.peak_end)) -
            Math.max(minutes(start), minutes(court.peak_start)),
        )
      : 0;
  const courtFee =
    court && duration > 0
      ? Math.round(
          ((duration - peakMinutes) * court.hourly_rate_standard +
            peakMinutes * court.hourly_rate_peak) /
            60,
        )
      : 0;
  const addonFee = addons.reduce(
    (sum, a) => sum + a.price * (quantities[a.id] || 0),
    0,
  );
  const selectedAddons = addons.filter(
    (addon) => (quantities[addon.id] || 0) > 0,
  );
  const visibleAddons = addons.filter((addon) =>
    addon.name
      .toLocaleLowerCase("vi")
      .includes(addonSearch.trim().toLocaleLowerCase("vi")),
  );
  const fieldClass = `${inputClass} mt-1.5 min-h-11 outline-none transition-shadow focus:border-sport-500 focus:ring-4 focus:ring-sport-100 dark:focus:ring-sport-950`;
  const labelClass =
    "block text-xs font-semibold text-neutral-600 dark:text-neutral-300";
  const panelClass =
    "rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900";

  function changeQuantity(addon: Addon, value: number) {
    const quantity = Math.min(
      addon.stock_quantity ?? 9999,
      Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
    );
    setQuantities((current) => ({ ...current, [addon.id]: quantity }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || calendarLoading || !calendarReady) return;
    if (!court || !venue || !starts.includes(start) || !ends.includes(end)) {
      setError(
        `Vui lòng chọn sân, ngày và khung giờ còn hiệu lực. Thời gian đặt tối thiểu ${court?.min_booking_minutes || 30} phút.`,
      );
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError("Vui lòng nhập tên khách và số điện thoại.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const booking = await venueRequest<OwnerBooking>("/bookings", "POST", {
        court_id: Number(courtId),
        booking_date: date,
        start_time: start,
        end_time: end,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        note,
        source: "counter",
        payment_method: method,
        payment_status: paid && method !== "vietqr" ? "paid" : "unpaid",
        addons: Object.entries(quantities)
          .filter(([, qty]) => qty > 0)
          .map(([id, quantity]) => ({ addon_id: Number(id), quantity })),
      });
      onSaved(booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được đơn.");
      setCalendarRetry((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <OwnerModal onClose={onClose} busy={busy}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-title"
        aria-describedby="counter-description"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-neutral-50 text-neutral-900 shadow-2xl dark:bg-neutral-950 dark:text-white"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-4 sm:px-7 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sport-50 text-sport-600 dark:bg-sport-950">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-sport-600 dark:text-sport-400">
                SportZone · Đặt sân trực tiếp
              </p>
              <h2 id="counter-title" className="text-lg font-bold sm:text-xl">
                Tạo đơn tại quầy
              </h2>
              <p
                id="counter-description"
                className="mt-1 hidden text-xs text-neutral-500 sm:block"
              >
                Chọn lịch sân, thêm dịch vụ và xác nhận thông tin khách hàng.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-sport-500 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0 space-y-4">
                <section
                  className={panelClass}
                  aria-labelledby="booking-schedule-title"
                >
                  <h3
                    id="booking-schedule-title"
                    className="mb-4 flex items-center gap-2 text-sm font-bold"
                  >
                    <CalendarDays className="h-4 w-4 text-sport-600" /> Thông
                    tin đặt sân
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={`${labelClass} sm:col-span-2`}>
                      Cơ sở
                      <select
                        className={fieldClass}
                        required
                        value={venueId}
                        onChange={(e) => {
                          setVenueId(e.target.value);
                          setStart("");
                          setEnd("");
                          setCourtId(
                            String(
                              venues
                                .find((v) => String(v.id) === e.target.value)
                                ?.courts?.find((c) => c.status === "active")
                                ?.id || "",
                            ),
                          );
                        }}
                      >
                        <option value="">Chọn cơ sở</option>
                        {venues
                          .filter((v) => v.status === "active")
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Sân thi đấu
                      <select
                        className={fieldClass}
                        required
                        value={courtId}
                        onChange={(e) => {
                          setCourtId(e.target.value);
                          setStart("");
                          setEnd("");
                        }}
                      >
                        <option value="">Chọn sân</option>
                        {courts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Ngày đặt sân
                      <input
                        className={`${fieldClass} tabular-nums`}
                        required
                        type="date"
                        min={localDate()}
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          setStart("");
                          setEnd("");
                        }}
                      />
                    </label>
                    <label className={labelClass}>
                      Giờ bắt đầu
                      <select
                        className={`${fieldClass} tabular-nums`}
                        required
                        value={start}
                        disabled={calendarLoading || !calendarReady || starts.length === 0}
                        onChange={(e) => {
                          setStart(e.target.value);
                          setEnd(
                            e.target.value && court
                              ? clock(
                                  minutes(e.target.value) +
                                    Number(court.min_booking_minutes),
                                )
                              : "",
                          );
                        }}
                      >
                        <option value="">{calendarLoading ? "Đang tải lịch sân…" : "Chọn giờ trống"}</option>
                        {starts.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      Giờ kết thúc
                      <select
                        className={`${fieldClass} tabular-nums`}
                        required
                        value={end}
                        disabled={calendarLoading || !calendarReady || !start}
                        onChange={(e) => setEnd(e.target.value)}
                      >
                        <option value="">Chọn giờ</option>
                        {ends.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {calendarError ? (
                    <div className="mt-3 text-xs text-rose-600" role="alert">
                      {calendarError}
                      <button type="button" className="ml-2 font-semibold underline" onClick={() => setCalendarRetry((value) => value + 1)}>Thử lại</button>
                    </div>
                  ) : calendarReady && !calendarLoading && starts.length === 0 ? (
                    <p role="status" className="mt-3 text-xs text-amber-600">Sân không còn khung giờ trống phù hợp trong ngày này. Vui lòng chọn ngày hoặc sân khác.</p>
                  ) : (
                    <p className="mt-3 text-xs text-neutral-500">Chỉ hiển thị giờ còn trống. Giờ kết thúc không vượt qua khung đã có khách đặt.</p>
                  )}
                </section>
                <section
                  className={panelClass}
                  aria-labelledby="booking-customer-title"
                >
                  <h3
                    id="booking-customer-title"
                    className="mb-4 flex items-center gap-2 text-sm font-bold"
                  >
                    <UserRound className="h-4 w-4 text-sport-600" /> Khách hàng
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      Tên khách <span className="text-rose-500">*</span>
                      <input
                        className={fieldClass}
                        required
                        maxLength={120}
                        autoComplete="name"
                        placeholder="Nhập họ tên khách"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label className={labelClass}>
                      Số điện thoại <span className="text-rose-500">*</span>
                      <input
                        className={fieldClass}
                        type="tel"
                        required
                        maxLength={20}
                        autoComplete="tel"
                        placeholder="Nhập số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                    <label className={`${labelClass} sm:col-span-2`}>
                      Ghi chú{" "}
                      <span className="font-normal text-neutral-400">
                        (không bắt buộc)
                      </span>
                      <textarea
                        className={`${fieldClass} resize-y`}
                        rows={2}
                        maxLength={500}
                        placeholder="Yêu cầu hoặc thông tin cần lưu ý…"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                  </div>
                </section>
                <section
                  className={panelClass}
                  aria-labelledby="booking-addons-title"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3
                      id="booking-addons-title"
                      className="flex items-center gap-2 text-sm font-bold"
                    >
                      <Coffee className="h-4 w-4 text-sport-600" /> Dịch vụ đi
                      kèm
                    </h3>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
                      Không bắt buộc
                    </span>
                  </div>
                  {loading ? (
                    <Notice>
                      Đang tải dịch vụ… Bạn vẫn có thể tạo đơn không kèm dịch
                      vụ.
                    </Notice>
                  ) : addonError ? (
                    <Notice error>
                      Chưa tải được dịch vụ.{" "}
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => setAddonRetry((value) => value + 1)}
                      >
                        Thử tải lại
                      </button>
                    </Notice>
                  ) : addons.length ? (
                    <>
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="search"
                          aria-label="Tìm dịch vụ"
                          placeholder="Tìm đồ uống, dụng cụ, dịch vụ…"
                          value={addonSearch}
                          onChange={(e) => setAddonSearch(e.target.value)}
                          className={`${fieldClass} mt-0 pl-9 font-normal`}
                        />
                      </div>
                      <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
                        {visibleAddons.map((addon) => {
                          const quantity = quantities[addon.id] || 0;
                          const soldOut = addon.stock_quantity === 0;
                          return (
                            <div
                              key={addon.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${quantity ? "border-sport-300 bg-sport-50/60 dark:border-sport-800 dark:bg-sport-950/30" : "border-neutral-100 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-800/40"}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-xs font-semibold leading-5 ${soldOut ? "text-neutral-400" : "text-neutral-800 dark:text-neutral-100"}`}
                                >
                                  {addon.name}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                  <span className="font-medium tabular-nums text-sport-700 dark:text-sport-400">
                                    {formatVND(addon.price)}
                                    <span className="font-normal text-neutral-400">
                                      {" "}
                                      / {addon.unit}
                                    </span>
                                  </span>
                                  {addon.stock_quantity != null && (
                                    <span
                                      className={
                                        soldOut
                                          ? "text-rose-600"
                                          : "text-neutral-500"
                                      }
                                    >
                                      {soldOut
                                        ? "Hết hàng"
                                        : `Còn ${addon.stock_quantity}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                                <button
                                  type="button"
                                  aria-label={`Giảm ${addon.name}`}
                                  disabled={busy || quantity === 0}
                                  onClick={() =>
                                    changeQuantity(addon, quantity - 1)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-l-lg text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  aria-label={`Số lượng ${addon.name}`}
                                  type="number"
                                  min={0}
                                  max={addon.stock_quantity ?? 9999}
                                  disabled={busy || soldOut}
                                  value={quantity}
                                  onChange={(e) =>
                                    changeQuantity(
                                      addon,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-9 w-10 border-x border-neutral-100 bg-transparent text-center text-xs font-semibold tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-sport-400 disabled:text-neutral-400 dark:border-neutral-800 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  aria-label={`Thêm ${addon.name}`}
                                  disabled={
                                    busy ||
                                    quantity >= (addon.stock_quantity ?? 9999)
                                  }
                                  onClick={() =>
                                    changeQuantity(addon, quantity + 1)
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-r-lg text-sport-600 hover:bg-sport-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-sport-950"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!visibleAddons.length && (
                          <p className="py-5 text-center text-xs text-neutral-500">
                            Không tìm thấy dịch vụ phù hợp.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="py-3 text-xs text-neutral-500">
                      Cơ sở chưa có dịch vụ đi kèm.
                    </p>
                  )}
                </section>
              </div>
              <aside className="space-y-4 lg:sticky lg:top-0">
                <section
                  className="overflow-hidden rounded-2xl border border-sport-200 bg-white dark:border-sport-900 dark:bg-neutral-900"
                  aria-labelledby="booking-summary-title"
                >
                  <div className="border-b border-sport-100 bg-sport-50 px-5 py-4 dark:border-sport-900 dark:bg-sport-950/40">
                    <h3
                      id="booking-summary-title"
                      className="flex items-center gap-2 text-sm font-bold text-sport-800 dark:text-sport-300"
                    >
                      <ReceiptText className="h-4 w-4" /> Chi tiết tạm tính
                    </h3>
                    <p className="mt-1 text-[11px] text-sport-700 dark:text-sport-400">
                      Kiểm tra thông tin trước khi tạo đơn
                    </p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-sm font-semibold">
                        {court?.name || "Chưa chọn sân"}
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-[11px] leading-5 text-neutral-500">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        {venue?.name || "Chưa chọn cơ sở"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <p className="text-xs text-neutral-500">
                        {date.split("-").reverse().join("/")}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-base font-bold tabular-nums">
                        {start || "--:--"}
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                        {end || "--:--"}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {duration > 0
                          ? `Thời lượng ${duration} phút`
                          : "Chọn khung giờ đặt sân"}
                      </p>
                    </div>
                    <dl className="space-y-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-500">Tiền sân</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatVND(courtFee)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-neutral-500">
                          Dịch vụ (
                          {selectedAddons.reduce(
                            (sum, addon) => sum + quantities[addon.id],
                            0,
                          )}
                          )
                        </dt>
                        <dd className="font-semibold tabular-nums">
                          {formatVND(addonFee)}
                        </dd>
                      </div>
                    </dl>
                    {selectedAddons.length > 0 && (
                      <ul className="max-h-28 space-y-2 overflow-y-auto border-t border-dashed border-neutral-200 pt-3 text-[11px] dark:border-neutral-700">
                        {selectedAddons.map((addon) => (
                          <li
                            key={addon.id}
                            className="flex justify-between gap-2"
                          >
                            <span className="text-neutral-500">
                              {quantities[addon.id]} × {addon.name}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatVND(addon.price * quantities[addon.id])}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                      <span className="text-sm font-semibold">Tổng cộng</span>
                      <strong
                        className="text-xl tabular-nums text-sport-700 dark:text-sport-400"
                        aria-live="polite"
                      >
                        {formatVND(courtFee + addonFee)}
                      </strong>
                    </div>
                  </div>
                </section>
                <section
                  className={panelClass}
                  aria-labelledby="booking-payment-title"
                >
                  <h3
                    id="booking-payment-title"
                    className="mb-4 flex items-center gap-2 text-sm font-bold"
                  >
                    <CreditCard className="h-4 w-4 text-sport-600" /> Thanh toán
                  </h3>
                  <label className={labelClass}>
                    Phương thức
                    <select
                      className={fieldClass}
                      value={method}
                      onChange={(e) => {
                        setMethod(e.target.value);
                        setPaid(false);
                      }}
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="bank_transfer">
                        Chuyển khoản tại quầy
                      </option>
                      <option value="vietqr">VietQR / SePay</option>
                    </select>
                  </label>
                  {method !== "vietqr" ? (
                    <>
                      <label
                        className={`mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs leading-5 transition-colors ${paid ? "border-sport-300 bg-sport-50 dark:border-sport-800 dark:bg-sport-950/30" : "border-neutral-200 dark:border-neutral-700"}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                          checked={paid}
                          onChange={(e) => setPaid(e.target.checked)}
                        />
                        <span className="font-medium">
                          Đã nhận đủ tiền từ khách
                        </span>
                      </label>
                      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                        {paid
                          ? "Đơn sẽ được xác nhận đã thanh toán."
                          : "Đơn tự xác nhận và ghi nhận chưa thanh toán để thu tiền sau."}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 rounded-xl bg-sky-50 p-3 text-[11px] leading-relaxed text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                      Hệ thống tự xác nhận sau khi nhận giao dịch SePay.
                    </p>
                  )}
                </section>
                <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-neutral-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sport-600" />
                  Giá tạm tính theo khung giờ đã chọn. Hệ thống kiểm tra lại
                  lịch trống khi tạo đơn.
                </p>
              </aside>
            </div>
          </div>
          <footer className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900">
            {error && (
              <div className="mb-3 max-h-24 overflow-y-auto">
                <Notice error>{error}</Notice>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  Tổng thanh toán tạm tính
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-sport-700 sm:text-2xl dark:text-sport-400">
                  {formatVND(courtFee + addonFee)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className={`${secondaryClass} hidden sm:block`}
                >
                  Hủy bỏ
                </button>
                <button
                  className={`${buttonClass} flex min-h-11 items-center justify-center gap-2 px-5 shadow-sm shadow-sport-600/20`}
                  type="submit"
                  disabled={busy || calendarLoading || !calendarReady || !starts.includes(start) || !ends.includes(end)}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {busy ? "Đang tạo…" : "Tạo đơn"}
                </button>
              </div>
            </div>
          </footer>
        </form>
      </section>
    </OwnerModal>
  );
}
