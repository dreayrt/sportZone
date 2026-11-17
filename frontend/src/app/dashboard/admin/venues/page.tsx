"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock3, Eye, MapPin, PauseCircle, Play, RefreshCw, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { OwnerModal } from "@/components/bookings/OwnerModal";
import { AdminVenueDetail, MonitorPagination, VenueStateBadge, pauseVenueClass, resumeVenueClass } from "@/components/venues/AdminVenueDetail";
import { Notice, inputClass, buttonClass, secondaryClass } from "@/components/venues/Shared";
import { queryString, venueRequest } from "@/lib/venues-api";
import { formatVND } from "@/lib/utils";
import type { PaginatedData } from "@/lib/api";
import type { MonitoredVenue, VenueMonitoringSummary } from "@/lib/admin-api";

interface MonitorList extends PaginatedData<MonitoredVenue> {
  summary: VenueMonitoringSummary;
  cities: string[];
}
const initialFilters = { search: "", status: "", city: "", sort: "newest", page: 1, per_page: 12 };
type Action = { venue: MonitoredVenue; suspend: boolean };

function VenueIdentity({ venue, onOpen }: { venue: MonitoredVenue; onOpen: () => void }) {
  return <div className="flex items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 text-sport-600 dark:border-neutral-800 dark:bg-neutral-800">{venue.image ? <img src={venue.image} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}</div>
    <div className="min-w-0"><button type="button" className="text-left text-sm font-semibold leading-5 text-neutral-900 transition-colors hover:text-sport-700 focus-visible:outline-sport-500 dark:text-white dark:hover:text-sport-400" onClick={onOpen}>{venue.name}</button><p className="mt-1 text-[10px] font-medium tracking-wide text-neutral-400">{venue.code}</p><p className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-neutral-500"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{venue.district}, {venue.city}</p></div>
  </div>;
}

function VenueActions({ venue, disabled, onOpen, onAction }: { venue: MonitoredVenue; disabled: boolean; onOpen: () => void; onAction: () => void }) {
  return <div className="flex flex-wrap items-center gap-2"><button type="button" className={`${secondaryClass} inline-flex min-h-10 items-center gap-1.5 !px-3 !text-xs`} disabled={disabled} onClick={onOpen}><Eye className="h-3.5 w-3.5" />Chi tiết</button><button type="button" className={venue.admin_suspended_at ? resumeVenueClass : pauseVenueClass} disabled={disabled} onClick={onAction}>{venue.admin_suspended_at ? <Play className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}{venue.admin_suspended_at ? "Mở lại" : "Tạm dừng"}</button></div>;
}

export default function AdminVenuesPage() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<MonitorList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  useEffect(() => {
    const ac = new AbortController(); setLoading(true); setError("");
    venueRequest<MonitorList>(`/admin/venues?${queryString(filters)}`, "GET", undefined, ac.signal)
      .then((result) => {
        if (ac.signal.aborted) return;
        if (filters.page > result.last_page) { setFilters((current) => ({ ...current, page: result.last_page })); return; }
        setData(result); setUpdatedAt(new Date());
      })
      .catch((e) => { if (!ac.signal.aborted) setError(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [filters, retry]);

  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !action && !selectedId) setRetry((value) => value + 1); }, 60000);
    return () => clearInterval(timer);
  }, [action, selectedId]);

  function startAction(venue: MonitoredVenue) {
    setAction({ venue, suspend: !venue.admin_suspended_at }); setReason(""); setActionError("");
  }
  async function refreshStatus() {
    if (!action || refreshingStatus) return;
    setRefreshingStatus(true);
    try {
      const result = await venueRequest<{ venue: MonitoredVenue }>(`/admin/venues/${action.venue.id}`);
      setAction((current) => current ? { ...current, venue: result.venue } : null);
      setActionError(""); setRetry((value) => value + 1);
    } catch (e) { setActionError(e instanceof Error ? e.message : "Không tải được trạng thái."); }
    finally { setRefreshingStatus(false); }
  }
  async function saveAction(event: React.FormEvent) {
    event.preventDefault();
    if (!action || busy || refreshingStatus || !!action.venue.admin_suspended_at === action.suspend) return;
    setBusy(true); setActionError(""); setMessage("");
    try {
      await venueRequest(`/admin/venues/${action.venue.id}/status`, "PUT", { suspended: action.suspend, reason: reason.trim(), expected_version: action.venue.status_version });
      setMessage(action.suspend ? `Đã tạm dừng nhận đơn mới tại ${action.venue.name}.` : `Đã gỡ tạm dừng của admin tại ${action.venue.name}.`);
      setAction(null); setRetry((value) => value + 1);
    } catch (e) { setActionError(e instanceof Error ? e.message : "Không cập nhật được trạng thái."); }
    finally { setBusy(false); }
  }
  const statuses = [
    { key: "", label: "Tất cả", count: data?.summary.total },
    { key: "active", label: "Hoạt động", count: data?.summary.active },
    { key: "suspended", label: "Admin tạm dừng", count: data?.summary.suspended },
    { key: "inactive", label: "Chủ sân tạm ngưng", count: data?.summary.inactive },
    { key: "pending", label: "Chờ xử lý", count: data?.summary.pending },
  ];
  const filtered = !!filters.search || !!filters.city || !!filters.status;
  const alreadyApplied = !!action && !!action.venue.admin_suspended_at === action.suspend;

  return <div className="font-sans">
    <DashboardHeader title="Giám sát cơ sở" description="Theo dõi đối tác, hoạt động sân và kiểm soát việc nhận đơn trên toàn hệ thống." actions={<button type="button" className={`${secondaryClass} inline-flex items-center gap-2`} disabled={loading} onClick={() => setRetry((value) => value + 1)}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Làm mới</button>} />
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      {message && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-sport-200 bg-sport-50 px-4 py-3 text-sm text-sport-800 dark:border-sport-900 dark:bg-sport-950/30 dark:text-sport-300"><span className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setMessage("")}><X className="h-4 w-4" /></button></div>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
        { key: "", label: "Tổng cơ sở", value: data?.summary.total, description: "Đối tác trên toàn hệ thống", icon: Building2, tone: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" },
        { key: "active", label: "Đang hoạt động", value: data?.summary.active, description: "Đang bật hoạt động, không bị admin dừng", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
        { key: "suspended", label: "Admin tạm dừng", value: data?.summary.suspended, description: "Chặn tiếp nhận đơn đặt sân mới", icon: ShieldAlert, tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" },
        { key: "pending", label: "Chờ xử lý", value: data?.summary.pending, description: "Cơ sở chưa bật hoạt động", icon: Clock3, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
      ].map(({ key, label, value, description, icon: Icon, tone }) => <button type="button" key={label} disabled={loading} onClick={() => setFilters({ ...filters, status: key, page: 1 })} className={`rounded-2xl border bg-white p-4 text-left transition-colors focus-visible:outline-sport-500 dark:bg-neutral-900 sm:p-5 ${filters.status === key ? "border-sport-300 ring-1 ring-sport-100 dark:border-sport-700 dark:ring-sport-900" : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"}`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-neutral-500">{label}</p><span className={`rounded-lg p-2 ${tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-3xl font-semibold leading-none tabular-nums tracking-tight">{value == null ? "—" : value.toLocaleString("vi-VN")}</p><p className="mt-2 text-[11px] leading-4 text-neutral-400">{description}</p></button>)}</div>
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-subtle dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-100 px-4 pt-5 dark:border-neutral-800 sm:px-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold tracking-tight">Danh sách cơ sở</h2><p className="mt-1 text-xs text-neutral-500">Xem tình hình vận hành và quản lý trạng thái từng đối tác.</p></div><span className="flex items-center gap-1.5 text-[10px] text-neutral-400"><span className="h-1.5 w-1.5 rounded-full bg-sport-500" />{updatedAt ? `Cập nhật ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}` : "Đang tải dữ liệu"} · Tự làm mới mỗi phút</span></div>
          <div className="mt-5 flex gap-1 overflow-x-auto" role="group" aria-label="Lọc trạng thái cơ sở">{statuses.map(({ key, label, count }) => <button type="button" key={key} disabled={loading} aria-pressed={filters.status === key} onClick={() => setFilters({ ...filters, status: key, page: 1 })} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors focus-visible:outline-sport-500 ${filters.status === key ? "border-sport-500 text-sport-700 dark:text-sport-400" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"}`}>{label}<span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${filters.status === key ? "bg-sport-50 text-sport-700 dark:bg-sport-950 dark:text-sport-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>{count ?? "—"}</span></button>)}</div>
        </div>
        <form className="flex flex-wrap items-end gap-3 border-b border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/20 sm:px-5" onSubmit={(event) => { event.preventDefault(); setFilters({ ...filters, search: search.trim(), city, page: 1 }); }}>
          <label className="min-w-48 flex-1 space-y-1.5 text-[11px] font-medium text-neutral-500"><span className="block">Tìm cơ sở hoặc chủ sân</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" /><input className={`${inputClass} !pl-9`} value={search} maxLength={150} placeholder="Tên, mã, địa chỉ hoặc liên hệ" onChange={(e) => setSearch(e.target.value)} /></span></label>
          <label className="space-y-1.5 text-[11px] font-medium text-neutral-500"><span className="block">Tỉnh / thành phố</span><select className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}><option value="">Tất cả khu vực</option>{data?.cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <button className={`${buttonClass} inline-flex items-center gap-1.5`} disabled={loading}><SlidersHorizontal className="h-3.5 w-3.5" />Áp dụng</button>
          {filtered && <button type="button" className="inline-flex min-h-10 items-center gap-1 px-2 text-xs text-neutral-500 hover:text-rose-600" disabled={loading} onClick={() => { setSearch(""); setCity(""); setFilters({ ...initialFilters, sort: filters.sort, per_page: filters.per_page }); }}><X className="h-3.5 w-3.5" />Xóa lọc</button>}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"><p className="text-xs text-neutral-500">{data ? <><strong className="font-semibold text-neutral-800 dark:text-neutral-200">{data.total.toLocaleString("vi-VN")}</strong> cơ sở{filtered ? " phù hợp" : " trong hệ thống"}{filters.city && ` · ${filters.city}`}</> : "Danh sách cơ sở"}</p><label className="flex items-center gap-2 text-[11px] text-neutral-500"><span>Sắp xếp</span><select className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 outline-sport-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300" value={filters.sort} disabled={loading} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 1 })}><option value="newest">Mới nhất</option><option value="name">Tên A–Z</option><option value="revenue">Doanh thu cao nhất</option><option value="bookings">Nhiều đơn nhất</option></select></label></div>
        {error && <div className="space-y-2 px-5 pb-4"><Notice error>{error}</Notice><button type="button" className={secondaryClass} disabled={loading} onClick={() => setRetry((value) => value + 1)}>Thử tải lại</button>{data && <p className="text-[10px] text-neutral-500">Đang hiển thị dữ liệu tải trước đó. Tải lại thành công để thực hiện thay đổi.</p>}</div>}
        <div aria-busy={loading}>
          {!data && loading ? <div role="status" className="space-y-4 p-5"><span className="sr-only">Đang tải các cơ sở</span>{[1, 2, 3].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}</div> : data?.data.length ? <>
            <div className="hidden overflow-x-auto lg:block"><table className="w-full text-left text-xs"><thead className="border-y border-neutral-100 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50"><tr>{["Cơ sở", "Chủ sân", "Hoạt động", "Doanh thu đã thu", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold">{label}</th>)}</tr></thead><tbody className={`divide-y divide-neutral-100 transition-opacity dark:divide-neutral-800 ${loading ? "opacity-50" : ""}`}>{data.data.map((venue) => <tr key={venue.id} className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/20"><td className="min-w-64 max-w-sm px-5 py-4"><VenueIdentity venue={venue} onOpen={() => setSelectedId(venue.id)} /></td><td className="px-5 py-4"><p className="whitespace-nowrap font-medium">{venue.owner?.full_name || "Chưa có chủ sân"}</p><p className="mt-1 text-[11px] text-neutral-500">{venue.owner?.phone || "Chưa có liên hệ"}</p>{venue.owner?.status === "blocked" && <span className="mt-1 inline-block text-[10px] text-rose-600">Tài khoản bị khóa</span>}</td><td className="whitespace-nowrap px-5 py-4"><p><strong className="font-semibold tabular-nums">{venue.active_courts_count}/{venue.courts_count}</strong><span className="text-neutral-500"> sân hoạt động</span></p><p className="mt-1 text-[11px] text-neutral-500">{venue.today_bookings_count} đơn hôm nay · {venue.bookings_count} tổng đơn</p></td><td className="whitespace-nowrap px-5 py-4"><p className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{formatVND(Number(venue.paid_revenue))}</p><p className="mt-1 text-[10px] text-neutral-500">Tháng này: {formatVND(Number(venue.monthly_revenue))}</p></td><td className="px-5 py-4"><VenueStateBadge venue={venue} />{venue.admin_suspension_reason && <p title={venue.admin_suspension_reason} className="mt-1.5 max-w-40 truncate text-[10px] text-rose-600 dark:text-rose-400">{venue.admin_suspension_reason}</p>}</td><td className="px-5 py-4"><VenueActions venue={venue} disabled={loading || !!error} onOpen={() => setSelectedId(venue.id)} onAction={() => startAction(venue)} /></td></tr>)}</tbody></table></div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">{data.data.map((venue) => <article key={venue.id} className="flex flex-col rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"><VenueIdentity venue={venue} onOpen={() => setSelectedId(venue.id)} /><div className="mt-3"><VenueStateBadge venue={venue} /></div><p className="mt-3 text-xs">{venue.owner?.full_name || "Chưa có chủ sân"}<span className="ml-2 text-[11px] text-neutral-500">{venue.owner?.phone}</span></p><div className="my-4 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 text-[11px] dark:bg-neutral-800/50"><div><p className="text-neutral-500">Sân hoạt động</p><p className="mt-1 font-semibold">{venue.active_courts_count}/{venue.courts_count}</p></div><div><p className="text-neutral-500">Doanh thu đã thu</p><p className="mt-1 font-semibold tabular-nums">{formatVND(Number(venue.paid_revenue))}</p></div></div>{venue.admin_suspension_reason && <p className="mb-3 break-words text-xs leading-5 text-rose-600">{venue.admin_suspension_reason}</p>}<div className="mt-auto border-t border-neutral-100 pt-3 dark:border-neutral-800"><VenueActions venue={venue} disabled={loading || !!error} onOpen={() => setSelectedId(venue.id)} onAction={() => startAction(venue)} /></div></article>)}</div>
          </> : !error && <div className="flex flex-col items-center px-5 py-12 text-center"><span className="rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800"><Building2 className="h-8 w-8 text-neutral-300" /></span><h3 className="mt-4 text-sm font-semibold">{filtered ? "Không tìm thấy cơ sở phù hợp" : "Chưa có cơ sở trong hệ thống"}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-neutral-500">{filtered ? "Thử tìm theo tên khác hoặc xóa bộ lọc để xem lại toàn bộ cơ sở." : "Các cơ sở được tạo bởi chủ sân sẽ xuất hiện tại đây."}</p>{filtered && <button className={`${secondaryClass} mt-4`} type="button" onClick={() => { setSearch(""); setCity(""); setFilters(initialFilters); }}>Xóa bộ lọc</button>}</div>}
        </div>
        {data && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 dark:border-neutral-800 sm:px-5"><label className="flex items-center gap-2 text-[11px] text-neutral-500">Hiển thị<select className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900" value={filters.per_page} disabled={loading} onChange={(e) => setFilters({ ...filters, per_page: Number(e.target.value), page: 1 })}>{[12, 24, 48].map((size) => <option key={size} value={size}>{size}</option>)}</select>cơ sở / trang</label><MonitorPagination page={data.current_page} lastPage={data.last_page} total={data.total} busy={loading} onPage={(page) => setFilters({ ...filters, page })} /></div>}
      </section>
      <p className="flex items-start gap-2 text-[11px] leading-5 text-neutral-400"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />Tạm dừng chỉ chặn đơn mới và ẩn cơ sở khỏi tìm kiếm. Các đơn đã đặt tiếp tục được giữ nguyên để xử lý.</p>
    </div>
    {selectedId && <AdminVenueDetail key={selectedId} venueId={selectedId} hidden={!!action} refreshKey={retry} onClose={() => setSelectedId(null)} onAction={startAction} />}
    {action && <OwnerModal onClose={() => setAction(null)} busy={busy || refreshingStatus}>
      <form role="dialog" aria-modal="true" aria-labelledby="venue-action-title" onSubmit={saveAction} className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-100 p-5 dark:border-neutral-800"><div className="flex items-start gap-3"><span className={`rounded-xl p-3 ${action.suspend ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40" : "bg-sport-50 text-sport-600 dark:bg-sport-950/40"}`}>{action.suspend ? <PauseCircle className="h-5 w-5" /> : <Play className="h-5 w-5" />}</span><div><h2 id="venue-action-title" className="text-lg font-semibold">{action.suspend ? "Tạm dừng cơ sở" : "Gỡ tạm dừng"}</h2><p className="mt-1 text-xs text-neutral-500">{action.venue.code} · Thay đổi quyền nhận đơn mới</p></div></div><button type="button" aria-label="Đóng thao tác" disabled={busy || refreshingStatus} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setAction(null)}><X className="h-5 w-5" /></button></header>
        <div className="space-y-4 overflow-y-auto p-5"><div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50"><p className="text-sm font-semibold">{action.venue.name}</p><p className="mt-1 text-xs text-neutral-500">{action.venue.district}, {action.venue.city}</p><div className="mt-3"><VenueStateBadge venue={action.venue} /></div></div>
          <div className={`rounded-xl border p-4 text-xs leading-5 ${action.suspend ? "border-rose-100 bg-rose-50/60 text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300" : "border-sport-100 bg-sport-50/60 text-sport-800 dark:border-sport-900 dark:bg-sport-950/20 dark:text-sport-300"}`}><p className="font-semibold">{action.suspend ? "Cơ sở sẽ ngừng nhận đơn mới" : "Gỡ lệnh tạm dừng của admin"}</p><p className="mt-1">{action.suspend ? "Khách không thể đặt thêm sân tại cơ sở này. Các đơn hiện có không tự hủy." : "Cơ sở chỉ nhận đặt sân trở lại khi chủ sân cũng đang bật trạng thái hoạt động."}</p>{action.venue.upcoming_bookings_count > 0 && <p className="mt-2 font-medium">Hiện có {action.venue.upcoming_bookings_count} lượt chơi chưa kết thúc cần tiếp tục xử lý.</p>}</div>
          {actionError && <div className="space-y-2"><Notice error>{actionError}</Notice><button type="button" className={`${secondaryClass} inline-flex items-center gap-2`} disabled={busy || refreshingStatus} onClick={() => void refreshStatus()}><RefreshCw className={`h-3 w-3 ${refreshingStatus ? "animate-spin" : ""}`} />Tải lại trạng thái</button></div>}
          {alreadyApplied && <Notice>Thao tác này đã được áp dụng bởi một quản trị viên. Hãy đóng cửa sổ để xem trạng thái mới.</Notice>}
          <label className="block space-y-2"><span className="text-xs font-semibold">Lý do {action.suspend ? "tạm dừng" : "mở lại"} <span className="text-rose-500">*</span></span><textarea required minLength={5} maxLength={500} rows={3} className={`${inputClass} resize-y`} value={reason} disabled={busy || refreshingStatus || alreadyApplied} placeholder={action.suspend ? "Mô tả vấn đề hoặc lý do cần tạm dừng cơ sở…" : "Ghi nhận kết quả khắc phục hoặc lý do mở lại…"} onChange={(e) => setReason(e.target.value)} /><span className="flex justify-between gap-2 text-[10px] text-neutral-400"><span>Tối thiểu 5 ký tự. Lý do được lưu vào lịch sử và hiển thị cho chủ sân.</span><span className="shrink-0 tabular-nums">{reason.length}/500</span></span></label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/20"><button type="button" className={secondaryClass} disabled={busy || refreshingStatus} onClick={() => setAction(null)}>Đóng</button><button className={action.suspend ? pauseVenueClass : resumeVenueClass} disabled={busy || refreshingStatus || alreadyApplied || reason.trim().length < 5}>{busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{busy ? "Đang lưu…" : action.suspend ? "Tạm dừng nhận đơn" : "Gỡ tạm dừng"}</button></footer>
      </form>
    </OwnerModal>}
  </div>;
}
