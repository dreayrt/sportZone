"use client";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Notice, inputClass, buttonClass, secondaryClass } from "@/components/venues/Shared";
import { venueRequest } from "@/lib/venues-api";
import type { AdminCategory } from "@/lib/admin-api";
import { Trophy, Plus } from "lucide-react";

const blank = { code: "", name: "", description: "", banner_image: "", sort_order: 0, is_active: true };
type CategoryForm = typeof blank & { id?: number };
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const ac = new AbortController(); setLoading(true); setError("");
    venueRequest<AdminCategory[]>("/admin/sport-categories", "GET", undefined, ac.signal)
      .then((data) => { if (!ac.signal.aborted) setCategories(data); })
      .catch((e) => { if (!ac.signal.aborted) setError(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [retry]);
  async function mutate(path: string, method: string, body?: unknown) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try { await venueRequest(path, method, body); setForm(null); setMessage("Đã cập nhật danh mục. Danh mục có dữ liệu liên quan sẽ được tạm ngưng khi xóa."); setRetry((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Không lưu được danh mục."); }
    finally { setBusy(false); }
  }
  const visible = categories.filter((c) => `${c.code} ${c.name}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")) && (!status || String(c.is_active) === status));
  return <div>
    <DashboardHeader title="Danh mục môn thể thao" description="Quản lý các môn thể thao và trạng thái hoạt động." actions={<button className={`${buttonClass} inline-flex items-center gap-2`} disabled={busy} onClick={() => { setForm({ ...blank }); setError(""); setMessage(""); }}><Plus className="h-4 w-4" />Thêm môn mới</button>} />
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
      {form && <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 font-semibold">{form.id ? "Sửa môn thể thao" : "Thêm môn thể thao"}</h2>
        <form onSubmit={(e) => { e.preventDefault(); void mutate(`/admin/sport-categories${form.id ? `/${form.id}` : ""}`, form.id ? "PUT" : "POST", { ...form, code: form.code.trim(), name: form.name.trim(), banner_image: form.banner_image.trim() || null }); }}>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {([ ["code", "Mã môn", 30], ["name", "Tên môn", 100], ["banner_image", "URL ảnh bìa", 500], ["description", "Mô tả", 255] ] as const).map(([key, label, max]) => <label key={key} className="space-y-1.5 text-xs font-medium"><span className="block">{label}</span><input className={inputClass} value={form[key]} maxLength={max} required={key === "code" || key === "name"} type={key === "banner_image" ? "url" : "text"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
            <label className="space-y-1.5 text-xs font-medium"><span className="block">Thứ tự hiển thị</span><input required type="number" min={0} step={1} className={inputClass} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Đang hoạt động</label>
          </fieldset>
          <div className="mt-4 flex justify-end gap-2"><button type="button" className={secondaryClass} disabled={busy} onClick={() => setForm(null)}>Hủy</button><button className={buttonClass} disabled={busy}>{busy ? "Đang lưu…" : "Lưu danh mục"}</button></div>
        </form>
      </section>}
      <div className="flex flex-wrap gap-3"><input aria-label="Tìm môn thể thao" placeholder="Tìm theo mã hoặc tên môn" className={`${inputClass} max-w-sm`} value={search} onChange={(e) => setSearch(e.target.value)} /><select aria-label="Trạng thái môn thể thao" className={`${inputClass} max-w-48`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="true">Hoạt động</option><option value="false">Tạm ngưng</option></select><button className={secondaryClass} disabled={loading || busy} onClick={() => setRetry((n) => n + 1)}>Làm mới</button></div>
      {loading ? <p role="status" className="text-sm text-neutral-500">Đang tải danh mục…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((c) => <article key={c.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {c.banner_image ? <img src={c.banner_image} alt={c.name} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-sport-50 text-sport-600 dark:bg-sport-950/30"><Trophy className="h-10 w-10" /></div>}
        <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-neutral-500">{c.code}</p><h2 className="font-semibold">{c.name}</h2></div><span className={`rounded-full px-2 py-1 text-xs ${c.is_active ? "bg-sport-50 text-sport-700 dark:bg-sport-950 dark:text-sport-300" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>{c.is_active ? "Hoạt động" : "Tạm ngưng"}</span></div>
          <p className="text-xs leading-5 text-neutral-500">{c.description || "Chưa có mô tả."}</p><p className="text-xs text-neutral-500">{c.active_courts_count} sân hoạt động / {c.courts_count} sân</p>
          <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <button className={secondaryClass} disabled={busy} onClick={() => { setForm({ id: c.id, code: c.code, name: c.name, description: c.description || "", banner_image: c.banner_image || "", sort_order: c.sort_order, is_active: c.is_active }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Sửa</button>
            <button className={secondaryClass} disabled={busy} onClick={() => { if (confirm(`${c.is_active ? "Tạm ngưng" : "Mở lại"} môn ${c.name}?`)) void mutate(`/admin/sport-categories/${c.id}`, "PUT", { is_active: !c.is_active }); }}>{c.is_active ? "Tạm ngưng" : "Mở lại"}</button>
            <button className="rounded-xl px-3 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={busy} onClick={() => { if (confirm(`Xóa môn ${c.name}? Nếu đã có dữ liệu liên quan, môn sẽ được tạm ngưng.`)) void mutate(`/admin/sport-categories/${c.id}`, "DELETE"); }}>Xóa</button>
          </div>
        </div>
      </article>)}{!visible.length && <p className="text-sm text-neutral-500">Không có môn thể thao phù hợp.</p>}</div>}
    </div>
  </div>;
}
