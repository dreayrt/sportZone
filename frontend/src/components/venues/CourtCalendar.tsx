"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { Slots, venueRequest, localDate } from "@/lib/venues-api";
import { Notice, inputClass, secondaryClass } from "./Shared";
import { SkeletonPanel } from "@/components/layout/RouteSkeletons";

type ViewMode = "day" | "week" | "month";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
function addDays(value: string, days: number): string {
  const d = parseDate(value);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
function addMonths(value: string, months: number): string {
  const d = parseDate(value);
  d.setMonth(d.getMonth() + months);
  return toISO(d);
}
function mondayOf(value: string): string {
  const d = parseDate(value);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
}
function weekDates(value: string): string[] {
  const monday = mondayOf(value);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
function monthDates(value: string): string[] {
  const d = parseDate(value);
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from(
    { length: count },
    (_, i) => toISO(new Date(d.getFullYear(), d.getMonth(), i + 1, 12)),
  );
}

type SlotState = "available" | "held" | "booked" | "past" | "closed";

const SLOT_TONE: Record<SlotState, string> = {
  held: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
  booked:
    "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30",
  available:
    "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  closed:
    "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
  past: "border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900",
};

const SLOT_STATE_LABEL: Record<SlotState, string> = {
  available: "Trống",
  booked: "Đã đặt",
  held: "Đang được giữ",
  past: "Đã qua giờ",
  closed: "Ngừng hoạt động",
};

export default function CourtCalendar({
  courtId,
  owner = false,
  role = "owner",
}: {
  courtId: number;
  owner?: boolean;
  role?: "owner" | "admin";
}) {
  const [view, setView] = useState<ViewMode>("day");
  const [date, setDate] = useState(localDate());
  const [data, setData] = useState<Slots | null>(null);
  const [weekData, setWeekData] = useState<Record<string, Slots>>({});
  const [monthData, setMonthData] = useState<Record<string, Slots>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const requestedDate = new URLSearchParams(window.location.search).get(
      "date",
    );
    if (requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate))
      setDate(requestedDate);
  }, []);
  useEffect(() => {
    setData(null);
  }, [courtId, date, owner, view]);
  useEffect(() => {
    if (view !== "day") return;
    const ac = new AbortController();
    setError("");
    let fetching = false;
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await venueRequest<Slots>(`/${owner ? "owner/" : ""}courts/${courtId}/calendar?date=${date}`, "GET", undefined, ac.signal);
        if (!ac.signal.aborted) { setData(result); setError(""); }
      } catch (error) {
        if (!ac.signal.aborted) setError(error instanceof Error ? error.message : "Không tải được lịch sân.");
      } finally { fetching = false; }
    };
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 3000);
    window.addEventListener("focus", load);
    return () => { ac.abort(); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [courtId, date, owner, refresh, view]);
  useEffect(() => {
    if (view === "day") return;
    const ac = new AbortController();
    const dates = view === "week" ? weekDates(date) : monthDates(date);
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const entries = await Promise.all(
          dates.map(async (d) => {
            const result = await venueRequest<Slots>(`/${owner ? "owner/" : ""}courts/${courtId}/calendar?date=${d}`, "GET", undefined, ac.signal);
            return [d, result] as const;
          }),
        );
        if (ac.signal.aborted) return;
        const map: Record<string, Slots> = Object.fromEntries(entries);
        if (view === "week") setWeekData(map);
        else setMonthData(map);
        setError("");
      } catch (error) {
        if (!ac.signal.aborted) setError(error instanceof Error ? error.message : "Không tải được lịch sân.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => { ac.abort(); window.removeEventListener("focus", load); };
  }, [courtId, date, owner, view, refresh]);

  const shift = (days: number) => setDate(addDays(date, days));
  const stepBack = () => {
    if (view === "day") shift(-1);
    else if (view === "week") shift(-7);
    else setDate(addMonths(date, -1));
  };
  const stepForward = () => {
    if (view === "day") shift(1);
    else if (view === "week") shift(7);
    else setDate(addMonths(date, 1));
  };
  const occupied =
    data?.slots.filter((slot) => slot.state === "booked").length || 0;

  const openDay = (d: string) => {
    setDate(d);
    setView("day");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-100 p-4 sm:p-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-end gap-2">
          <button
            aria-label={view === "month" ? "Tháng trước" : view === "week" ? "Tuần trước" : "Ngày trước"}
            className={secondaryClass}
            onClick={stepBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="text-xs font-medium text-neutral-500">
            {view === "day"
              ? "Ngày xem lịch"
              : view === "week"
                ? "Tuần xem lịch"
                : "Tháng xem lịch"}
            {view === "day" ? (
              <input
                aria-label="Ngày xem lịch"
                type="date"
                className={`${inputClass} mt-1 !w-40 font-semibold text-neutral-900 dark:text-white`}
                value={date}
                required
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
              />
            ) : (
              <span className="mt-1 block min-w-40 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white">
                {view === "week"
                  ? `${mondayOf(date).slice(8, 10)}/${mondayOf(date).slice(5, 7)} – ${addDays(mondayOf(date), 6).slice(8, 10)}/${addDays(mondayOf(date), 6).slice(5, 7)}`
                  : `Tháng ${parseDate(date).getMonth() + 1}/${parseDate(date).getFullYear()}`}
              </span>
            )}
          </label>
          <button
            aria-label={view === "month" ? "Tháng sau" : view === "week" ? "Tuần sau" : "Ngày sau"}
            className={secondaryClass}
            onClick={stepForward}
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
          <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-700">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === mode
                    ? "bg-sport-600 text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
                onClick={() => setView(mode)}
              >
                {mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : "Tháng"}
              </button>
            ))}
          </div>
          <button
            aria-label="Làm mới lịch sân"
            className={secondaryClass}
            onClick={() => setRefresh((v) => v + 1)}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error ? (
        <div className="p-5">
          <Notice error>
            {error}{" "}
            <button
              className="underline"
              onClick={() => setRefresh((v) => v + 1)}
            >
              Thử lại
            </button>
          </Notice>
        </div>
      ) : view === "day" && !data ? (
        <div className="p-5">
          <SkeletonPanel height="min-h-40" />
        </div>
      ) : view === "week" && loading && !Object.keys(weekData).length ? (
        <div className="p-5">
          <SkeletonPanel height="min-h-40" />
        </div>
      ) : view === "month" && loading && !Object.keys(monthData).length ? (
        <div className="p-5">
          <SkeletonPanel height="min-h-40" />
        </div>
      ) : (
        <>
          {view !== "month" && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/70 px-5 py-3 text-xs dark:bg-neutral-950/30">
              <span className="text-neutral-500">
                {view === "day" && data
                  ? `Đặt tối thiểu ${data.min_booking_minutes} phút${
                      owner ? ` · ${occupied} khung giờ đã có đơn` : ""
                    }`
                  : view === "week"
                    ? "Lịch sân cả tuần · bấm vào một ngày để xem chi tiết"
                    : ""}
              </span>
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sport-500" />
                  Còn trống
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Đã đặt
                </span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Đang giữ</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  {owner ? "Đã qua giờ" : "Không khả dụng"}
                </span>
                {owner && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    Ngừng hoạt động
                  </span>
                )}
              </div>
            </div>
          )}

          {view === "day" && data && (
            <>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-5">
                {data.slots.map((slot) => {
                  const booking = owner ? slot.booking : null;
                  const tone = SLOT_TONE[slot.state ?? "past"] ?? SLOT_TONE.past;
                  return (
                    <div
                      key={slot.start}
                      className={`rounded-xl border p-3.5 ${tone}`}
                    >
                      <p className="font-sans text-sm font-semibold leading-6 tabular-nums tracking-normal">
                        {slot.start}{" "}
                        <span className="font-normal text-neutral-400">–</span>{" "}
                        {slot.end}
                      </p>
                      {booking ? (
                        <>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đã đặt
                          </p>
                          <Link
                            href={
                              role === "admin"
                                ? `/dashboard/admin/bookings?search=${booking.booking_code}`
                                : `/dashboard/owner/bookings?booking=${booking.booking_code}`
                            }
                            className="mt-2 block font-mono text-[11px] font-bold text-indigo-700 underline dark:text-indigo-300"
                          >
                            {booking.booking_code}
                          </Link>
                          <p
                            className="mt-1 truncate text-xs font-medium"
                            title={booking.customer_name}
                          >
                            {booking.customer_name}
                          </p>
                          <p className="mt-1 text-xs tabular-nums text-neutral-500">
                            {booking.start_time.slice(0, 5)} –{" "}
                            {booking.end_time.slice(0, 5)}
                          </p>
                          <p className="mt-2 text-[10px] font-medium text-indigo-600 dark:text-indigo-300">
                            {booking.checked_in
                              ? "Đã check-in"
                              : booking.status === "completed"
                                ? "Đã hoàn thành"
                                : booking.status === "no_show"
                                  ? "Khách không đến"
                                  : booking.payment_status === "paid"
                                    ? "Đã thanh toán"
                                    : "Chưa thanh toán đủ"}
                          </p>
                        </>
                      ) : (
                        <p
                          className={`mt-2 flex items-center gap-1.5 text-xs ${slot.available ? "text-emerald-700 dark:text-emerald-400" : slot.state === "closed" ? "text-rose-700 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {SLOT_STATE_LABEL[slot.state ?? "past"]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {!data.slots.length && (
                <div className="p-5">
                  <Notice>Cơ sở chưa có giờ hoạt động hợp lệ.</Notice>
                </div>
              )}
            </>
          )}

          {view === "week" && (
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5 xl:grid-cols-7">
              {weekDates(date).map((d) => {
                const day = weekData[d];
                const isToday = d === localDate();
                return (
                  <div
                    key={d}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                  >
                    <button
                      className={`w-full px-2 py-2 text-xs font-bold text-left border-b ${
                        isToday
                          ? "bg-sport-600 text-white"
                          : "bg-neutral-50 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                      }`}
                      onClick={() => openDay(d)}
                      title="Xem chi tiết ngày"
                    >
                      {DAY_LABELS[(parseDate(d).getDay() + 6) % 7]} ·{" "}
                      {d.slice(8, 10)}/{d.slice(5, 7)}
                    </button>
                    <div className="p-1.5 space-y-1 max-h-72 overflow-y-auto">
                      {!day ? (
                        <p className="p-1 text-[11px] text-neutral-400">
                          Đang tải…
                        </p>
                      ) : !day.slots.length ? (
                        <p className="p-1 text-[11px] text-neutral-400">
                          Không có giờ
                        </p>
                      ) : (
                        day.slots.map((slot) => {
                          const tone =
                            SLOT_TONE[slot.state ?? "past"] ?? SLOT_TONE.past;
                          const booking = owner ? slot.booking : null;
                          return (
                            <div
                              key={slot.start}
                              className={`rounded-md border px-1.5 py-1 text-[11px] font-medium leading-4 ${tone}`}
                              title={booking ? booking.customer_name : undefined}
                            >
                              <span className="tabular-nums">
                                {slot.start}–{slot.end}
                              </span>
                              <span className="block text-neutral-500 dark:text-neutral-400">
                                {booking
                                  ? "Đã đặt"
                                  : SLOT_STATE_LABEL[slot.state ?? "past"]}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "month" && (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="px-2 py-1 text-center text-[11px] font-bold text-neutral-500"
                  >
                    {label}
                  </div>
                ))}
                {(() => {
                  const first = parseDate(monthDates(date)[0]);
                  const offset = (first.getDay() + 6) % 7;
                  const days = monthDates(date);
                  const today = localDate();
                  const cells: React.ReactNode[] = [];
                  for (let i = 0; i < offset; i++) {
                    cells.push(
                      <div key={`pad-${i}`} className="min-h-16 rounded-lg bg-neutral-50/60 dark:bg-neutral-950/30" />,
                    );
                  }
                  days.forEach((d) => {
                    const day = monthData[d];
                    const isToday = d === today;
                    const total = day?.slots.length ?? 0;
                    const free =
                      day?.slots.filter((s) => s.available).length ?? 0;
                    const booked =
                      day?.slots.filter((s) => s.state === "booked").length ??
                      0;
                    cells.push(
                      <button
                        key={d}
                        onClick={() => openDay(d)}
                        className={`min-h-16 rounded-lg border p-1.5 text-left transition-colors ${
                          isToday
                            ? "border-sport-600 ring-1 ring-sport-600"
                            : "border-neutral-200 hover:border-sport-400 dark:border-neutral-700"
                        }`}
                      >
                        <span className="block text-xs font-bold">
                          {Number(d.slice(8, 10))}
                        </span>
                        {!day ? (
                          <span className="block text-[10px] text-neutral-400">
                            …
                          </span>
                        ) : (
                          <>
                            <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              {free}/{total} trống
                            </span>
                            {owner && (
                              <span className="block text-[10px] text-indigo-600 dark:text-indigo-300">
                                {booked} đơn
                              </span>
                            )}
                          </>
                        )}
                      </button>,
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
