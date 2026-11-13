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

export default function CourtCalendar({
  courtId,
  owner = false,
  role = "owner",
}: {
  courtId: number;
  owner?: boolean;
  role?: "owner" | "admin";
}) {
  const [date, setDate] = useState(localDate());
  const [data, setData] = useState<Slots | null>(null);
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
    const ac = new AbortController();
    setData(null);
    setError("");
    venueRequest<Slots>(
      `/${owner ? "owner/" : ""}courts/${courtId}/calendar?date=${date}`,
      "GET",
      undefined,
      ac.signal,
    )
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ac.abort();
  }, [courtId, date, owner, refresh]);
  useEffect(() => {
    if (!owner) return;
    const timer = setInterval(() => {
      if (!document.hidden) setRefresh((value) => value + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, [owner]);
  const shift = (days: number) => {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() + days);
    setDate(
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    );
  };
  const occupied =
    data?.slots.filter((slot) => slot.state === "booked").length || 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-100 p-4 sm:p-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-end gap-2">
          <button
            aria-label="Ngày trước"
            className={secondaryClass}
            onClick={() => shift(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="text-xs font-medium text-neutral-500">
            Ngày xem lịch
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
          </label>
          <button
            aria-label="Ngày sau"
            className={secondaryClass}
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
        <button
          aria-label="Làm mới lịch sân"
          className={secondaryClass}
          onClick={() => setRefresh((v) => v + 1)}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
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
      ) : !data ? (
        <div className="p-5">
          <Notice>Đang tải lịch…</Notice>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50/70 px-5 py-3 text-xs dark:bg-neutral-950/30">
            <span className="text-neutral-500">
              Đặt tối thiểu {data.min_booking_minutes} phút
              {owner && ` · ${occupied} khung giờ đã có đơn`}
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
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 xl:grid-cols-5">
            {data.slots.map((slot) => {
              const booking = owner ? slot.booking : null;
              const tone = booking
                ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30"
                : slot.available
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : slot.state === "closed"
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                    : "border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900";
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
                      {slot.available
                        ? "Trống"
                        : slot.state === "past"
                          ? "Đã qua giờ"
                          : slot.state === "closed"
                            ? "Ngừng hoạt động"
                            : "Đã đặt"}
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
    </section>
  );
}
