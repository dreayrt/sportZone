"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays } from "lucide-react";
import { Notice, inputClass, secondaryClass } from "@/components/venues/Shared";
import CourtCalendar from "@/components/venues/CourtCalendar";
import { Court, Venue, venueRequest } from "@/lib/venues-api";

interface AdminVenueDetail {
  venue: Venue & { courts?: Court[] };
}

export default function AdminCourtCalendarPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtId, setCourtId] = useState<string>("");
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [error, setError] = useState("");

  // Tải danh sách tất cả cơ sở sân thể thao trên toàn hệ thống
  useEffect(() => {
    setLoadingVenues(true);
    venueRequest<{ data: Venue[] }>("/admin/venues?per_page=100")
      .then((res) => {
        const list = res?.data || [];
        setVenues(list);
        if (list.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const venueParam = params.get("venue");
          const found = list.find((v) => String(v.id) === venueParam);
          setSelectedVenueId(String(found ? found.id : list[0].id));
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Không tải được danh sách cơ sở.");
      })
      .finally(() => {
        setLoadingVenues(false);
      });
  }, []);

  // Khi chọn cơ sở, tải chi tiết các sân thi đấu của cơ sở đó
  useEffect(() => {
    if (!selectedVenueId) return;

    setLoadingCourts(true);
    venueRequest<AdminVenueDetail>(`/admin/venues/${selectedVenueId}`)
      .then((res) => {
        const ven = res?.venue;
        if (ven) {
          setCurrentVenue(ven);
          const listCourts = ven.courts || [];
          setCourts(listCourts);
          if (listCourts.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const courtParam = params.get("court");
            const foundCourt = listCourts.find((c) => String(c.id) === courtParam);
            setCourtId(String(foundCourt ? foundCourt.id : listCourts[0].id));
          } else {
            setCourtId("");
          }
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Không tải được danh sách sân.");
      })
      .finally(() => {
        setLoadingCourts(false);
      });
  }, [selectedVenueId]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* TIÊU ĐỀ & NÚT CHỌN CƠ SỞ (GIỐNG HỆT GIAO DIỆN YÊU CẦU) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sport-600">
            <CalendarDays className="h-4 w-4" />
            Vận hành sân
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Lịch sân cơ sở
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Theo dõi giờ trống và đơn đã đặt tại{" "}
            {currentVenue?.name || "cơ sở bạn chọn"}.
          </p>
        </div>

        {/* Dropdown chọn Cơ sở Sân toàn hệ thống (Dạng thẻ Pill chuẩn) */}
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Building2 className="h-4 w-4 text-sport-600 shrink-0" />
          <span className="text-xs font-medium text-neutral-500 shrink-0">Cơ sở:</span>
          <select
            aria-label="Chọn cơ sở thể thao"
            disabled={loadingVenues || venues.length === 0}
            className="border-none bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-0 dark:text-white cursor-pointer"
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
            }}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="text-neutral-900 dark:text-neutral-100">
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <Notice error>{error}</Notice>}

      {/* CHỌN SÂN THI ĐẤU & LƯỚI KHUNG GIỜ CỦA SÂN ĐÓ */}
      {loadingCourts ? (
        <Notice>Đang tải danh sách sân thi đấu…</Notice>
      ) : !courts.length ? (
        <Notice>
          Cơ sở này hiện chưa có sân thi đấu nào được tạo.{" "}
          <Link className="underline font-semibold" href="/dashboard/admin/venues">
            Quay lại quản lý cơ sở
          </Link>
          .
        </Notice>
      ) : (
        <>
          <label className="block max-w-md text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Sân thi đấu
            <select
              className={`${inputClass} mt-2 text-sm font-semibold text-neutral-900 dark:text-white`}
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

          {courtId && (
            <CourtCalendar
              key={courtId}
              courtId={Number(courtId)}
              owner={true}
              role="admin"
            />
          )}
        </>
      )}
    </div>
  );
}
