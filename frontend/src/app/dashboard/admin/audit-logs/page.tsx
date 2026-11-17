"use client";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Notice, inputClass, secondaryClass, buttonClass } from "@/components/venues/Shared";
import { queryString, venueRequest } from "@/lib/venues-api";
import type { PaginatedData } from "@/lib/api";
import type { AdminAuditLog } from "@/lib/admin-api";

export default function AdminAuditLogsPage() {
  const [data, setData] = useState<PaginatedData<AdminAuditLog> | null>(null);
  const [search, setSearch] = useState(""); const [date, setDate] = useState("");
  const [filters, setFilters] = useState({ search: "", date: "", page: 1 });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const ac = new AbortController(); setLoading(true); setError("");
    venueRequest<PaginatedData<AdminAuditLog>>(`/admin/audit-logs?${queryString(filters)}`, "GET", undefined, ac.signal)
      .then((result) => { if (!ac.signal.aborted) setData(result); })
      .catch((e) => { if (!ac.signal.aborted) { setData(null); setError(e.message); } })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [filters, retry]);
  return <div>
    <DashboardHeader title="Nhật ký quản trị" description="Theo dõi thay đổi danh mục, người dùng, voucher và cấu hình của quản trị viên." />
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {error && <Notice error>{error}</Notice>}
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" onSubmit={(e) => { e.preventDefault(); setFilters({ search, date, page: 1 }); }}>
        <label className="min-w-48 flex-1 space-y-1.5 text-xs font-medium"><span className="block">Hành động, đối tượng hoặc người thực hiện</span><input className={inputClass} value={search} maxLength={150} onChange={(e) => setSearch(e.target.value)} /></label>
        <label className="space-y-1.5 text-xs font-medium"><span className="block">Ngày</span><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button className={buttonClass} disabled={loading}>Lọc</button><button type="button" className={secondaryClass} disabled={loading} onClick={() => setRetry((n) => n + 1)}>Làm mới</button>
        <button type="button" className={secondaryClass} onClick={() => { setSearch(""); setDate(""); setFilters({ search: "", date: "", page: 1 }); }}>Xóa lọc</button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"><div className="overflow-x-auto">
        <table className="w-full text-left text-sm"><thead className="bg-sport-50 text-xs text-sport-800 dark:bg-sport-950/40 dark:text-sport-300"><tr>{["Hành động", "Đối tượng", "Người thực hiện", "Địa chỉ IP", "Thời gian"].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{loading ? <tr><td colSpan={5} className="p-8 text-center text-neutral-500">Đang tải nhật ký…</td></tr> : data?.data.length ? data.data.map((log) => <tr key={log.id}>
            <td className="px-4 py-3"><span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium dark:bg-neutral-800">{log.action}</span></td>
            <td className="px-4 py-3 text-xs">{log.entity_type || "—"}{log.entity_id != null && ` #${log.entity_id}`}</td><td className="px-4 py-3">{log.user?.full_name || "Hệ thống / tài khoản đã xóa"}</td><td className="px-4 py-3 text-xs text-neutral-500">{log.ip_address || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-500">{new Date(log.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
          </tr>) : <tr><td colSpan={5} className="p-8 text-center text-sm text-neutral-500">{error ? "Không tải được nhật ký. Hãy thử lại." : "Chưa có nhật ký phù hợp. Các thao tác quản trị mới sẽ xuất hiện tại đây."}</td></tr>}</tbody>
        </table>
      </div>{data && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 p-4 text-xs text-neutral-500 dark:border-neutral-800"><span>{data.total} bản ghi · Trang {data.current_page}/{data.last_page}</span><div className="flex gap-2"><button className={secondaryClass} disabled={loading || filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Trước</button><button className={secondaryClass} disabled={loading || filters.page >= data.last_page} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Sau</button></div></div>}</div>
    </div>
  </div>;
}
