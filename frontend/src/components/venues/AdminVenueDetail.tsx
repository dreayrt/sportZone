"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarDays, CircleDollarSign, Clock3, ExternalLink, History, Mail, MapPin, PauseCircle, Phone, Play, RefreshCw, ShieldAlert, Trophy, UserRound, X } from "lucide-react";
import { OwnerModal } from "@/components/bookings/OwnerModal";
import { Notice, inputClass, secondaryClass } from "./Shared";
import { queryString, venueRequest } from "@/lib/venues-api";
import { formatDate, formatVND } from "@/lib/utils";
import type { AdminAuditLog, MonitoredVenue } from "@/lib/admin-api";
import type { PaginatedData } from "@/lib/api";
import { paymentLabels, type OwnerBooking } from "@/lib/owner-api";

export const monitorActionClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const pauseVenueClass = `${monitorActionClass} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-500 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60`;
export const resumeVenueClass = `${monitorActionClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-500 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60`;
const panelClass = "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
const paymentColors = { unpaid: "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/30", partial: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30", paid: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30", refunded: "text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/30" };

export function VenueStateBadge({ venue }: { venue: MonitoredVenue }) {
  const suspended = !!venue.admin_suspended_at;
  const label = suspended ? "Admin tạm dừng" : venue.status === "active" ? "Đang hoạt động" : venue.status === "pending" ? "Chờ xử lý" : "Chủ sân tạm ngưng";
  const color = suspended ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900" : venue.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${color}`}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

export function MonitorPagination({ page, lastPage, total, busy, onPage }: { page: number; lastPage: number; total: number; busy: boolean; onPage: (page: number) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-neutral-500"><span>{total.toLocaleString("vi-VN")} kết quả · Trang {page}/{lastPage}</span><div className="flex gap-2"><button type="button" className={secondaryClass} disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Trước</button><button type="button" className={secondaryClass} disabled={busy || page >= lastPage} onClick={() => onPage(page + 1)}>Sau</button></div></div>;
}

interface VenueDetail {
  venue: MonitoredVenue;
  bookings: PaginatedData<OwnerBooking>;
  history: AdminAuditLog[];
  history_pagination: Omit<PaginatedData<AdminAuditLog>, "data">;
}

export function AdminVenueDetail({ venueId, hidden, refreshKey, onClose, onAction }: {
  venueId: number; hidden: boolean; refreshKey: number; onClose: () => void; onAction: (venue: MonitoredVenue) => void;
}) {
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState({ booking_search: "", booking_date: "", payment_status: "" });
  const [filters, setFilters] = useState({ ...form, bookings_page: 1, history_page: 1 });
  const [courtSearch, setCourtSearch] = useState("");
  const [courtStatus, setCourtStatus] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true); setError("");
    venueRequest<VenueDetail>(`/admin/venues/${venueId}?${queryString(filters)}`, "GET", undefined, ac.signal)
      .then((data) => { if (!ac.signal.aborted) setDetail(data); })
      .catch((e) => { if (!ac.signal.aborted) setError(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [venueId, filters, retry, refreshKey]);

  if (hidden) return null;
  const venue = detail?.venue;
  const courts = venue?.courts?.filter((court) => court.name.toLocaleLowerCase("vi").includes(courtSearch.toLocaleLowerCase("vi")) && (!courtStatus || court.status === courtStatus)) || [];
  const tabs = [
    { key: "overview", label: "Tổng quan", icon: Building2 },
    { key: "courts", label: `Sân thi đấu${venue ? ` (${venue.courts_count})` : ""}`, icon: Trophy },
    { key: "bookings", label: "Đơn đặt sân", icon: CalendarDays },
    { key: "history", label: "Lịch sử quản lý", icon: History },
  ];

  return <OwnerModal onClose={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="venue-detail-title" className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-neutral-50 shadow-2xl dark:bg-neutral-950">
      <header className="shrink-0 border-b border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-widest text-sport-600">Giám sát cơ sở · {venue?.code || "Đang tải"}</p><h2 id="venue-detail-title" className="mt-1 break-words text-lg font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-xl">{venue?.name || "Chi tiết cơ sở"}</h2><div className="mt-2 flex flex-wrap items-center gap-2">{venue && <VenueStateBadge venue={venue} />}<span className="text-xs text-neutral-500">Thông tin vận hành và quản lý hoạt động</span></div></div><button type="button" className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-sport-500 dark:hover:bg-neutral-800 dark:hover:text-white" onClick={onClose} aria-label="Đóng chi tiết cơ sở"><X className="h-5 w-5" /></button></div>
      </header>
      <div className="shrink-0 overflow-x-auto border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900" role="tablist" aria-label="Chi tiết giám sát cơ sở">
        <div className="flex min-w-max gap-1">{tabs.map(({ key, label, icon: Icon }) => <button type="button" key={key} id={`venue-tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="venue-detail-panel" tabIndex={tab === key ? 0 : -1} onKeyDown={(event) => { const index = tabs.findIndex((item) => item.key === key); const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); setTab(tabs[next].key); document.getElementById(`venue-tab-${tabs[next].key}`)?.focus(); } }} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-sport-500 ${tab === key ? "border-sport-500 text-sport-700 dark:text-sport-400" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
      </div>
      <div id="venue-detail-panel" role="tabpanel" aria-labelledby={`venue-tab-${tab}`} aria-busy={loading} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {error && <div className="space-y-2"><Notice error>{error}</Notice><button type="button" className={secondaryClass} onClick={() => setRetry((n) => n + 1)}>Tải lại thông tin</button></div>}
        {loading && <div role="status" className="flex items-center gap-2 text-xs text-neutral-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Đang cập nhật dữ liệu…</div>}
        {!detail && loading && <div className="grid animate-pulse gap-4 sm:grid-cols-2"><div className="h-40 rounded-xl bg-neutral-200/60 dark:bg-neutral-800" /><div className="h-40 rounded-xl bg-neutral-200/60 dark:bg-neutral-800" /></div>}
        {venue && tab === "overview" && <>
          {venue.admin_suspended_at && <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0"><p className="text-sm font-semibold">Cơ sở đang tạm dừng nhận đơn mới</p><p className="mt-1 break-words text-xs leading-5">{venue.admin_suspension_reason}</p><p className="mt-1 text-[11px] opacity-75">Từ {new Date(venue.admin_suspended_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Đơn đã đặt vẫn được giữ nguyên.</p></div></div>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
            { label: "Sân hoạt động", value: `${venue.active_courts_count}/${venue.courts_count}`, icon: Trophy },
            { label: "Đơn hôm nay", value: venue.today_bookings_count, icon: CalendarDays },
            { label: "Lượt chơi sắp tới", value: venue.upcoming_bookings_count, icon: Clock3 },
            { label: "Đã thu tháng này", value: formatVND(Number(venue.monthly_revenue)), icon: CircleDollarSign },
          ].map(({ label, value, icon: Icon }) => <div key={label} className={panelClass}><Icon className="h-4 w-4 text-sport-600" /><p className="mt-3 text-[11px] text-neutral-500">{label}</p><p className="mt-1 break-words text-lg font-semibold tabular-nums tracking-tight">{value}</p></div>)}</div>
          <div className="grid gap-4 md:grid-cols-2"><section className={panelClass}><h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-sport-600" />Thông tin cơ sở</h3><dl className="mt-4 space-y-3 text-xs"><div className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-neutral-400" /><dd className="leading-5">{venue.address}, {venue.district}, {venue.city}</dd></div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-neutral-400" /><dt className="text-neutral-500">Giờ mở cửa</dt><dd className="ml-auto tabular-nums">{venue.open_time.slice(0, 5)}–{venue.close_time.slice(0, 5)}</dd></div><div className="flex items-center gap-2"><Phone className="h-4 w-4 text-neutral-400" /><dt className="text-neutral-500">Liên hệ</dt><dd className="ml-auto">{venue.phone || "Chưa cập nhật"}</dd></div><div className="flex justify-between gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800"><dt className="text-neutral-500">Tổng doanh thu đã thu</dt><dd className="font-semibold tabular-nums text-sport-700 dark:text-sport-400">{formatVND(Number(venue.paid_revenue))}</dd></div></dl><p className="mt-3 text-[10px] leading-4 text-neutral-400">Doanh thu lấy từ giao dịch đã thu, loại giao dịch hoàn và đơn hủy.</p></section>
          <section className={panelClass}><h3 className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-sport-600" />Chủ cơ sở</h3><p className="mt-4 text-base font-semibold">{venue.owner?.full_name || "Chưa có chủ cơ sở"}</p><p className={`mt-1 text-xs ${venue.owner?.status === "blocked" ? "text-rose-600" : "text-neutral-500"}`}>{venue.owner ? venue.owner.status === "active" ? "Tài khoản đang hoạt động" : "Tài khoản đã bị khóa" : "Cần kiểm tra thông tin đối tác"}</p><div className="mt-4 space-y-3 text-xs text-neutral-600 dark:text-neutral-400"><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-neutral-400" />{venue.owner?.phone || "Chưa có số điện thoại"}</p><p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 shrink-0 text-neutral-400" />{venue.owner?.email || "Chưa có email"}</p></div><div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800"><a className="inline-flex items-center gap-1.5 text-xs font-medium text-sport-700 hover:underline dark:text-sport-400" href={`/dashboard/admin/users?search=${encodeURIComponent(venue.owner?.phone || venue.owner?.full_name || "")}`}>Quản lý tài khoản chủ sân<ExternalLink className="h-3 w-3" /></a></div></section></div>
        </>}
        {venue && tab === "courts" && <section className="space-y-4"><div className="flex flex-wrap gap-3"><input aria-label="Tìm sân thi đấu" className={`${inputClass} max-w-sm`} value={courtSearch} placeholder="Tìm tên sân" onChange={(e) => setCourtSearch(e.target.value)} /><select aria-label="Lọc trạng thái sân" className={`${inputClass} max-w-48`} value={courtStatus} onChange={(e) => setCourtStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="maintenance">Bảo trì</option><option value="closed">Tạm ngưng</option></select></div><p className="text-xs text-neutral-500">{venue.active_courts_count} sân hoạt động · {venue.maintenance_courts_count} sân bảo trì. {venue.admin_suspended_at ? "Toàn bộ sân đang ngừng nhận đơn mới theo lệnh admin." : ""}</p><div className="grid gap-3 sm:grid-cols-2">{courts.map((court) => <div key={court.id} className={panelClass}><div className="flex justify-between gap-2"><Trophy className="h-5 w-5 text-sport-600" /><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${court.status === "active" ? "bg-sport-50 text-sport-700 dark:bg-sport-950 dark:text-sport-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{court.status === "active" ? "Hoạt động" : court.status === "maintenance" ? "Bảo trì" : "Tạm ngưng"}</span></div><p className="mt-3 text-sm font-semibold">{court.name}</p><p className="mt-1 text-xs text-neutral-500">{court.code} · {court.sport_category?.name}</p><p className="mt-4 text-sm font-semibold tabular-nums">{formatVND(court.hourly_rate_standard)}<span className="text-xs font-normal text-neutral-500"> / giờ thường</span></p></div>)}</div>{!courts.length && <p className="py-8 text-center text-sm text-neutral-500">Không có sân phù hợp.</p>}</section>}
        {detail && tab === "bookings" && <section className="space-y-4"><form className={`${panelClass} flex flex-wrap items-end gap-3`} onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, ...form, bookings_page: 1 }); }}><label className="min-w-40 flex-1 space-y-1 text-[11px] font-medium"><span className="block">Mã đơn, khách hàng hoặc SĐT</span><input className={inputClass} maxLength={120} value={form.booking_search} onChange={(e) => setForm({ ...form, booking_search: e.target.value })} /></label><label className="space-y-1 text-[11px] font-medium"><span className="block">Ngày chơi</span><input type="date" className={inputClass} value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} /></label><label className="space-y-1 text-[11px] font-medium"><span className="block">Thanh toán</span><select className={inputClass} value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="">Tất cả</option>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className={secondaryClass} disabled={loading}>Lọc</button><button type="button" className="px-2 py-2 text-xs text-neutral-500 hover:text-sport-600" onClick={() => { const empty = { booking_search: "", booking_date: "", payment_status: "" }; setForm(empty); setFilters({ ...filters, ...empty, bookings_page: 1 }); }}>Xóa lọc</button></form>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"><table className="w-full text-left text-xs"><thead className="bg-sport-50 text-sport-800 dark:bg-sport-950/30 dark:text-sport-300"><tr>{["Đơn / Khách hàng", "Sân / Thời gian", "Tổng tiền", "Tình trạng"].map((label) => <th key={label} className="whitespace-nowrap p-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{detail.bookings.data.map((booking) => <tr key={booking.id}><td className="p-3"><p className="font-semibold">{booking.booking_code}</p><p className="mt-1">{booking.customer_name}</p><p className="mt-0.5 text-[10px] text-neutral-500">{booking.customer_phone}</p></td><td className="p-3"><p>{booking.court?.name}</p><p className="mt-1 whitespace-nowrap text-neutral-500">{formatDate(booking.booking_date)} · {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}</p></td><td className="whitespace-nowrap p-3 font-medium tabular-nums">{formatVND(booking.total_price)}</td><td className="p-3"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${paymentColors[booking.payment_status]}`}>{paymentLabels[booking.payment_status]}</span>{["cancelled", "completed", "no_show"].includes(booking.status) && <p className="mt-1 text-[10px] text-neutral-500">{booking.status === "cancelled" ? "Đã hủy" : booking.status === "completed" ? "Hoàn thành" : "Khách không đến"}</p>}{booking.checked_in && <p className="mt-1 text-[10px] text-sport-600">Đã check-in</p>}</td></tr>)}{!detail.bookings.data.length && <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Không có đơn đặt phù hợp với bộ lọc.</td></tr>}</tbody></table></div>
          <MonitorPagination page={detail.bookings.current_page} lastPage={detail.bookings.last_page} total={detail.bookings.total} busy={loading} onPage={(page) => setFilters({ ...filters, bookings_page: page })} />
        </section>}
        {detail && tab === "history" && <section className={panelClass}><h3 className="text-sm font-semibold">Lịch sử tạm dừng và mở lại</h3><p className="mt-1 text-xs text-neutral-500">Người thực hiện, thời gian và lý do được lưu cùng mỗi thay đổi.</p><div className="mt-5 space-y-5">{detail.history.map((log) => {
          let metadata: { suspended?: boolean; reason?: string } = {};
          try { metadata = JSON.parse(log.details || "{}"); } catch { /* Historical entries may contain plain text. */ }
          return <article key={log.id} className="relative border-l-2 border-neutral-200 pl-5 dark:border-neutral-700"><span className={`absolute -left-[7px] top-0 h-3 w-3 rounded-full border-2 border-white dark:border-neutral-900 ${metadata.suspended ? "bg-rose-400" : "bg-emerald-400"}`} /><div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-xs font-semibold ${metadata.suspended ? "text-rose-700 dark:text-rose-300" : "text-sport-700 dark:text-sport-300"}`}>{typeof metadata.suspended === "boolean" ? metadata.suspended ? "Tạm dừng nhận đơn mới" : "Gỡ tạm dừng của admin" : log.action}</p><time className="text-[10px] text-neutral-400">{new Date(log.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></div><p className="mt-2 break-words text-xs leading-5">{metadata.reason || "Không có lý do được ghi nhận."}</p><p className="mt-1 text-[11px] text-neutral-500">Bởi {log.user?.full_name || "Quản trị viên"}</p></article>;
        })}{!detail.history.length && <p className="py-8 text-center text-sm text-neutral-500">Chưa có thay đổi trạng thái quản trị.</p>}</div><MonitorPagination page={detail.history_pagination.current_page} lastPage={detail.history_pagination.last_page} total={detail.history_pagination.total} busy={loading} onPage={(page) => setFilters({ ...filters, history_page: page })} /></section>}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900"><button type="button" className={`${secondaryClass} inline-flex items-center gap-2`} disabled={loading} onClick={() => setRetry((n) => n + 1)}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Làm mới</button><div className="flex gap-2">{venue && venue.status === "active" && !venue.admin_suspended_at && <a className={`${secondaryClass} inline-flex items-center gap-2`} href={`/venues/${venue.slug}`} target="_blank" rel="noreferrer">Trang cơ sở<ExternalLink className="h-3.5 w-3.5" /></a>}{venue && <button type="button" disabled={loading || !!error} className={venue.admin_suspended_at ? resumeVenueClass : pauseVenueClass} onClick={() => onAction(venue)}>{venue.admin_suspended_at ? <Play className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}{venue.admin_suspended_at ? "Gỡ tạm dừng" : "Tạm dừng cơ sở"}</button>}</div></footer>
    </section>
  </OwnerModal>;
}
