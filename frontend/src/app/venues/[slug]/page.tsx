"use client";
import { useEffect, useState, type MouseEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Venue, venueRequest } from "@/lib/venues-api";
import { formatVND } from "@/lib/utils";
import {
  Notice,
  buttonClass,
  secondaryClass,
} from "@/components/venues/Shared";
import CourtCalendar from "@/components/venues/CourtCalendar";
export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState("");
  const [image, setImage] = useState("");
  const [courtId, setCourtId] = useState<number | null>(null);
  const handleBookCourt = (event: MouseEvent<HTMLAnchorElement>, id: number) => {
    if (!isLoading && !user) {
      event.preventDefault();
      const target = `/booking/${id}`;
      router.push(`/auth/login?redirect=${encodeURIComponent(target)}`);
    }
  };
  useEffect(() => {
    const ac = new AbortController();
    setVenue(null);
    setError("");
    venueRequest<Venue>(
      `/venues/${encodeURIComponent(slug)}`,
      "GET",
      undefined,
      ac.signal,
    )
      .then((v) => {
        setVenue(v);
        setImage(v.image || v.gallery?.[0] || "");
        setCourtId(v.courts?.[0]?.id || null);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ac.abort();
  }, [slug]);
  if (error)
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-4">
        <Notice error>{error}</Notice>
        <Link className={secondaryClass} href="/venues">
          Về danh sách sân
        </Link>
      </div>
    );
  if (!venue)
    return (
      <div className="p-8">
        <Notice>Đang tải cơ sở…</Notice>
      </div>
    );
  const address = [venue.address, venue.ward, venue.district, venue.city]
    .filter(Boolean)
    .join(", ");
  const location =
    venue.latitude != null && venue.longitude != null
      ? `${venue.latitude},${venue.longitude}`
      : address;
  const images = Array.from(
    new Set(
      [venue.image, ...(venue.gallery || [])].filter(Boolean) as string[],
    ),
  );
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <Link href="/venues" className="text-sport-700 text-sm">
        ← Danh sách cơ sở
      </Link>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          {image ? (
            <img
              src={image}
              alt={venue.name}
              className="h-80 w-full object-cover rounded-2xl"
            />
          ) : (
            <div className="h-80 bg-sport-50 rounded-2xl flex items-center justify-center text-sport-700">
              SportZone
            </div>
          )}
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {images.map((src, i) => (
              <button
                aria-label={`Xem ảnh ${i + 1}`}
                key={src}
                onClick={() => setImage(src)}
                className={`shrink-0 rounded-lg border-2 ${image === src ? "border-sport-600" : "border-transparent"}`}
              >
                <img
                  src={src}
                  alt={`Ảnh cơ sở ${i + 1}`}
                  className="w-20 h-16 object-cover rounded-md"
                />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-xs uppercase font-bold text-sport-600">
            {venue.code}
          </p>
          <h1 className="text-3xl font-bold">{venue.name}</h1>
          <p className="text-neutral-500">{address}</p>
          <p className="text-amber-600">
            ★ {Number(venue.rating).toFixed(1)} · {venue.review_count} đánh giá
          </p>
          <p className="text-sm">
            Mở cửa {venue.open_time.slice(0, 5)}–{venue.close_time.slice(0, 5)}
          </p>
          <a className="text-sport-700 block" href={`tel:${venue.phone}`}>
            {venue.phone}
          </a>
          <p className="text-sm whitespace-pre-line leading-relaxed">
            {venue.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {venue.amenities?.map((a) => (
              <span
                key={a.id}
                className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs"
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Sân tại cơ sở</h2>
        {!venue.courts?.length && <Notice>Chưa có sân đang hoạt động.</Notice>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venue.courts?.map((c) => (
            <article
              key={c.id}
              className="p-5 border border-neutral-200 dark:border-neutral-700 rounded-2xl space-y-3"
            >
              <h3 className="font-bold">{c.name}</h3>
              <p className="text-sm text-neutral-500">
                {c.sport_category?.name} · {c.surface_type} ·{" "}
                {c.indoor ? "Trong nhà" : "Ngoài trời"}
              </p>
              <p className="text-sm">
                Giờ thường:{" "}
                <strong>{formatVND(c.hourly_rate_standard)}/giờ</strong>
              </p>
              <p className="text-sm">
                Cao điểm {c.peak_start.slice(0, 5)}–{c.peak_end.slice(0, 5)}:{" "}
                <strong>{formatVND(c.hourly_rate_peak)}/giờ</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={secondaryClass}
                  onClick={() => setCourtId(c.id)}
                >
                  Xem lịch
                </button>
                <Link
                  className={buttonClass}
                  href={`/booking/${c.id}`}
                  onClick={(event) => handleBookCourt(event, c.id)}
                >
                  Đặt sân
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      {courtId && (
        <section className="border rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-xl">
            Lịch {venue.courts?.find((c) => c.id === courtId)?.name}
          </h2>
          <CourtCalendar courtId={courtId} />
        </section>
      )}
      <section className="space-y-4">
        <div className="flex justify-between flex-wrap gap-3">
          <h2 className="text-xl font-bold">Vị trí cơ sở</h2>
          <a
            className={secondaryClass}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
          >
            Mở chỉ đường
          </a>
        </div>
        <iframe
          title={`Bản đồ ${venue.name}`}
          className="w-full h-80 rounded-2xl border"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed`}
        />
      </section>
    </div>
  );
}
