"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { Building2, ChevronDown, MapPin } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Venue, venueRequest } from "@/lib/venues-api";
import { Notice, inputClass } from "@/components/venues/Shared";

interface OwnerVenueState {
  venues: Venue[];
  venueId: string;
  venue: Venue | undefined;
  selectVenue: (id: string) => void;
  refreshVenues: (preferredId?: number) => Promise<void>;
}

const OwnerVenueContext = createContext<OwnerVenueState | null>(null);

export function useOwnerVenue() {
  const context = useContext(OwnerVenueContext);
  if (!context) throw new Error("OwnerVenueProvider is required");
  return context;
}

export function useOptionalOwnerVenue() {
  return useContext(OwnerVenueContext);
}

export function OwnerVenueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storageKey = `sz_owner_venue_${user?.id}`;

  const refreshVenues = useCallback(
    async (preferredId?: number) => {
      const list = await venueRequest<Venue[]>("/owner/venues");
      setVenues(list);
      setVenueId((current) => {
        const saved = preferredId
          ? String(preferredId)
          : current || localStorage.getItem(storageKey) || "";
        const next = list.some((v) => String(v.id) === saved)
          ? saved
          : String(list[0]?.id || "");
        localStorage.setItem(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    refreshVenues()
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Không tải được cơ sở.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshVenues]);

  const selectVenue = (id: string) => {
    if (!venues.some((v) => String(v.id) === id)) return;
    localStorage.setItem(storageKey, id);
    setVenueId(id);
  };
  const venue = venues.find((v) => String(v.id) === venueId);

  return (
    <OwnerVenueContext.Provider
      value={{ venues, venueId, venue, selectVenue, refreshVenues }}
    >
      <section
        aria-label="Chọn cơ sở quản lý"
        className="border-b border-neutral-200/80 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-950 sm:px-6 lg:px-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* NÚT CHỌN CƠ SỞ GIỐNG HỆT HÌNH ẢNH YÊU CẦU */}
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <Building2 className="h-4 w-4 text-sport-600 shrink-0" />
              <span className="text-xs font-medium text-neutral-500 shrink-0">Cơ sở:</span>
              <select
                id="owner-active-venue"
                title={venue?.name}
                aria-label="Chọn cơ sở thể thao"
                disabled={loading || !venues.length}
                className="border-none bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-0 dark:text-white cursor-pointer"
                value={venueId}
                onChange={(e) => selectVenue(e.target.value)}
              >
                {!venues.length && (
                  <option value="">
                    {loading ? "Đang tải cơ sở…" : "Chưa có cơ sở"}
                  </option>
                )}
                {venues.map((v) => (
                  <option key={v.id} value={v.id} className="text-neutral-900 dark:text-neutral-100">
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {venue && (
              <p className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span>
                  {[venue.address, venue.district, venue.city]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {venue && (
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${venue.status === "active" && !venue.admin_suspended_at ? "bg-sport-50 text-sport-700 dark:bg-sport-950 dark:text-sport-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${venue.status === "active" && !venue.admin_suspended_at ? "bg-sport-500" : "bg-amber-500"}`}
                />
                {venue.admin_suspended_at ? "Admin tạm dừng" : venue.status === "active"
                  ? "Đang hoạt động"
                  : venue.status === "pending"
                    ? "Chờ xử lý"
                    : "Ngừng hoạt động"}
              </span>
            )}
            <Link
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-sport-300 hover:text-sport-700 dark:border-neutral-800 dark:text-neutral-400"
              href="/dashboard/owner/venues"
            >
              Hồ sơ cơ sở
            </Link>
          </div>
        </div>
      </section>
      {venue?.admin_suspended_at && <div className="px-4 pt-4 sm:px-6"><Notice error>Cơ sở đang bị quản trị viên tạm dừng nhận đặt sân mới. Lý do: {venue.admin_suspension_reason || "Vui lòng liên hệ quản trị viên."}</Notice></div>}
      {loading ? (
        <div className="p-6">
          <Notice>Đang tải cơ sở quản lý…</Notice>
        </div>
      ) : error ? (
        <div className="p-6">
          <Notice error>
            {error}{" "}
            <button
              className="underline"
              onClick={() => {
                setLoading(true);
                setError("");
                refreshVenues()
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }}
            >
              Thử lại
            </button>
          </Notice>
        </div>
      ) : (
        <div key={venueId}>{children}</div>
      )}
    </OwnerVenueContext.Provider>
  );
}

export function OwnerVenueSelectButton({ className = "" }: { className?: string }) {
  const { venues, venueId, venue, selectVenue } = useOwnerVenue();
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <Building2 className="h-4 w-4 text-sport-600 shrink-0" />
      <span className="text-xs font-medium text-neutral-500 shrink-0">
        Cơ sở:
      </span>
      <select
        id="owner-venue-pill"
        title={venue?.name}
        aria-label="Chọn cơ sở thể thao"
        disabled={!venues.length}
        className="cursor-pointer border-none bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-0 dark:text-white"
        value={venueId}
        onChange={(e) => selectVenue(e.target.value)}
      >
        {!venues.length && <option value="">Chưa có cơ sở</option>}
        {venues.map((v) => (
          <option
            key={v.id}
            value={v.id}
            className="text-neutral-900 dark:text-neutral-100"
          >
            {v.name}
          </option>
        ))}
      </select>
    </div>
  );
}
