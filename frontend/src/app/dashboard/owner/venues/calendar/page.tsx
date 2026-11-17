"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useOwnerVenue } from "@/context/OwnerVenueContext";
import { Notice, inputClass, secondaryClass } from "@/components/venues/Shared";
import CourtCalendar from "@/components/venues/CourtCalendar";

export default function Page() {
  const { venue } = useOwnerVenue();
  const courts = venue?.courts || [];
  const [courtId, setCourtId] = useState(String(courts[0]?.id || ""));
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sport-600">
            <CalendarDays className="h-4 w-4" />
            Vận hành sân
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Lịch sân cơ sở</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Theo dõi giờ trống và đơn đã đặt tại{" "}
            {venue?.name || "cơ sở của bạn"}.
          </p>
        </div>
        <Link className={secondaryClass} href="/dashboard/owner/calendar">
          Xem lưới tất cả sân
        </Link>
      </div>
      {!courts.length ? (
        <Notice>
          Chưa có sân tại cơ sở này.{" "}
          <Link className="underline" href="/dashboard/owner/courts">
            Thêm sân thi đấu
          </Link>
          .
        </Notice>
      ) : (
        <>
          <label className="block max-w-md text-sm font-medium">
            Sân thi đấu
            <select
              className={`${inputClass} mt-2`}
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.status === "maintenance"
                    ? " · Bảo trì"
                    : c.status === "closed"
                      ? " · Đóng cửa"
                      : ""}
                </option>
              ))}
            </select>
          </label>
          <CourtCalendar key={courtId} courtId={Number(courtId)} owner />
        </>
      )}
    </div>
  );
}
