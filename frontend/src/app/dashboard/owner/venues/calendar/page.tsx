"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Court, Venue, venueRequest } from "@/lib/venues-api";
import {
  OwnerGuard,
  Notice,
  inputClass,
  secondaryClass,
} from "@/components/venues/Shared";
import CourtCalendar from "@/components/venues/CourtCalendar";
function Calendar() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const ac = new AbortController();
    venueRequest<Venue[]>("/owner/venues", "GET", undefined, ac.signal)
      .then((v) => {
        setVenues(v);
        setVenueId(String(v[0]?.id || ""));
        setCourtId(String(v[0]?.courts?.[0]?.id || ""));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);
  const courts: Court[] =
    venues.find((v) => String(v.id) === venueId)?.courts || [];
  return (
    <div className="space-y-5">
      <div className="flex justify-between gap-3">
        <h1 className="text-2xl font-bold">Lịch sân cơ sở</h1>
        <Link className={secondaryClass} href="/dashboard/owner/venues">
          Quản lý cơ sở
        </Link>
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Notice>Đang tải…</Notice>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              Cơ sở
              <select
                className={inputClass}
                value={venueId}
                onChange={(e) => {
                  setVenueId(e.target.value);
                  setCourtId(
                    String(
                      venues.find((v) => String(v.id) === e.target.value)
                        ?.courts?.[0]?.id || "",
                    ),
                  );
                }}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Sân
              <select
                className={inputClass}
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {courtId ? (
            <CourtCalendar courtId={Number(courtId)} owner />
          ) : (
            <Notice>Chưa có sân. Hãy thêm cơ sở và sân trước.</Notice>
          )}
        </>
      )}
    </div>
  );
}
export default function Page() {
  return (
    <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto">
      <OwnerGuard>
        <Calendar />
      </OwnerGuard>
    </div>
  );
}
