"use client";
import { useEffect, useRef, useState } from "react";
import { Venue } from "@/lib/venues-api";
import { Notice } from "./Shared";
let googleLoader: Promise<void> | null = null;
function loadGoogle(): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (googleLoader) return googleLoader;
  googleLoader = new Promise((resolve, reject) => {
    const callback = "sportZoneMapsReady";
    (window as any)[callback] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "")}&callback=${callback}&loading=async&libraries=marker&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Không tải được Google Maps."));
    document.head.appendChild(script);
  });
  return googleLoader;
}
export default function VenueMap({
  venues,
  onSelect,
}: {
  venues: Venue[];
  onSelect: (venue: Venue) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const markers: any[] = [];
    loadGoogle()
      .then(() => {
        if (cancelled || !container.current) return;
        const maps = (window as any).google.maps;
        const points = venues.filter(
          (v) => v.latitude != null && v.longitude != null,
        );
        const map = new maps.Map(container.current, {
          center: { lat: 10.7769, lng: 106.7009 },
          zoom: 11,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
        });
        const bounds = new maps.LatLngBounds();
        points.forEach((v) => {
          const position = {
            lat: Number(v.latitude),
            lng: Number(v.longitude),
          };
          bounds.extend(position);
          const marker = new maps.marker.AdvancedMarkerElement({
            map,
            position,
            title: v.name,
          });
          marker.addListener("click", () => onSelect(v));
          markers.push(marker);
        });
        if (points.length > 1) map.fitBounds(bounds);
        else if (points.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(14);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
      markers.forEach((m) => {
        m.map = null;
      });
    };
  }, [key, venues, onSelect]);
  if (!key)
    return (
      <Notice>
        Bản đồ tương tác chưa được cấu hình. Bạn vẫn có thể xem địa chỉ và mở
        chỉ đường ở trang chi tiết cơ sở.
      </Notice>
    );
  if (error) return <Notice error>{error}</Notice>;
  return (
    <div
      ref={container}
      className="w-full h-[500px] rounded-2xl border border-neutral-200"
      aria-label="Bản đồ các cơ sở thể thao"
    />
  );
}
