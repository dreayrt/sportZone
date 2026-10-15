"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Venue } from "@/lib/venues-api";
import { formatVND } from "@/lib/utils";
export const inputClass =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm";
export const buttonClass =
  "rounded-xl bg-sport-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-sport-700";
export const secondaryClass =
  "rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50";
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`p-4 rounded-xl text-sm ${error ? "bg-red-50 text-red-700" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}
    >
      {children}
    </p>
  );
}
export function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Notice>Đang kiểm tra tài khoản…</Notice>;
  if (!user)
    return (
      <Notice>
        Vui lòng{" "}
        <Link className="underline" href="/auth/login">
          đăng nhập bằng tài khoản chủ sân
        </Link>{" "}
        để quản lý cơ sở.
      </Notice>
    );
  if (user.role !== "owner")
    return <Notice error>Tính năng này dành cho chủ sân.</Notice>;
  return <>{children}</>;
}
export function VenueCard({
  venue,
  list = false,
}: {
  venue: Venue;
  list?: boolean;
}) {
  return (
    <article
      className={`bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden ${list ? "sm:flex" : ""}`}
    >
      {venue.image ? (
        <img
          src={venue.image}
          alt={venue.name}
          className={`object-cover h-48 ${list ? "sm:w-64 w-full" : "w-full"}`}
        />
      ) : (
        <div
          className={`bg-sport-50 text-sport-700 h-48 flex items-center justify-center ${list ? "sm:w-64" : "w-full"}`}
        >
          SportZone
        </div>
      )}
      <div className="p-5 flex-1 space-y-3">
        <div className="flex justify-between gap-3">
          <h2 className="font-bold text-lg">{venue.name}</h2>
          <span className="text-amber-600 text-sm whitespace-nowrap">
            ★ {Number(venue.rating).toFixed(1)}
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          {venue.address}, {venue.district}, {venue.city}
        </p>
        <div className="flex flex-wrap gap-2">
          {venue.amenities?.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg"
            >
              {a.name}
            </span>
          ))}
        </div>
        {venue.distance_km != null && (
          <p className="text-sm text-sport-700">
            Cách bạn {Number(venue.distance_km).toFixed(1)} km
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="font-bold text-sport-600">
            {venue.min_price != null
              ? `${formatVND(venue.min_price)}/giờ`
              : "Xem bảng giá"}
          </span>
          <Link className={buttonClass} href={`/venues/${venue.slug}`}>
            Chi tiết sân
          </Link>
        </div>
      </div>
    </article>
  );
}
