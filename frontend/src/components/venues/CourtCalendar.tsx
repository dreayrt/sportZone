"use client";
import { useEffect, useState } from "react";
import { Slots, venueRequest, localDate } from "@/lib/venues-api";
import { Notice, inputClass } from "./Shared";
export default function CourtCalendar({
  courtId,
  owner = false,
}: {
  courtId: number;
  owner?: boolean;
}) {
  const [date, setDate] = useState(localDate());
  const [data, setData] = useState<Slots | null>(null);
  const [error, setError] = useState("");
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
  }, [courtId, date, owner]);
  return (
    <div className="space-y-3">
      <label className="text-sm block">
        Ngày xem lịch
        <input
          aria-label="Ngày xem lịch"
          type="date"
          className={`${inputClass} mt-1 max-w-xs block`}
          value={date}
          required
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      {error ? (
        <Notice error>{error}</Notice>
      ) : !data ? (
        <Notice>Đang tải lịch…</Notice>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            Xanh: còn trống · Xám: đã đặt hoặc sân ngừng hoạt động. Thời gian
            đặt tối thiểu {data.min_booking_minutes} phút.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2">
            {data.slots.map((s) => (
              <div
                key={s.start}
                className={`rounded-lg p-2 text-center text-xs border ${s.available ? "bg-sport-50 text-sport-800 border-sport-200" : "bg-neutral-100 text-neutral-500 border-neutral-200"}`}
              >
                {s.start}–{s.end}
                <span className="block mt-1">
                  {s.available ? "Trống" : "Không trống"}
                </span>
              </div>
            ))}
          </div>
          {!data.slots.length && (
            <Notice>Cơ sở chưa có giờ hoạt động hợp lệ.</Notice>
          )}
        </>
      )}
    </div>
  );
}
