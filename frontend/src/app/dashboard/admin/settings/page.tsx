"use client";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Notice, inputClass, buttonClass, secondaryClass } from "@/components/venues/Shared";
import { venueRequest } from "@/lib/venues-api";
import type { AdminSettings } from "@/lib/admin-api";

type SettingField = { key: keyof AdminSettings; label: string; type?: "number"; min?: number; max?: number; maxLength?: number };
const groups: { title: string; description: string; fields: SettingField[] }[] = [
  { title: "Tài khoản nhận thanh toán SePay", description: "Áp dụng cho mã QR mới và đối soát tài khoản nhận tiền. Khóa webhook được quản lý ở máy chủ.", fields: [
    { key: "sepay_bank_name", label: "Ngân hàng (mã SePay, ví dụ MBBank)", maxLength: 100 },
    { key: "sepay_account_no", label: "Số tài khoản", maxLength: 30 },
    { key: "sepay_account_name", label: "Tên chủ tài khoản", maxLength: 150 },
  ] },
  { title: "Tích điểm và giới thiệu", description: "Áp dụng cho các lần tích điểm và nhận thưởng tiếp theo.", fields: [
    { key: "loyalty_points_per_10k", label: "Điểm tích lũy cho mỗi 10.000đ", type: "number", min: 0, max: 10000 },
    { key: "referral_referrer_points", label: "Điểm thưởng người giới thiệu", type: "number", min: 0, max: 100000 },
    { key: "referral_referred_points", label: "Điểm thưởng người được giới thiệu", type: "number", min: 0, max: 100000 },
  ] },
  { title: "Hỗ trợ và nhắc lịch", description: "Thời gian nhắc được sử dụng khi hệ thống chạy tác vụ nhắc lịch.", fields: [
    { key: "hotline", label: "Hotline hỗ trợ", maxLength: 30 },
    { key: "reminder_before_minutes", label: "Nhắc lịch trước giờ chơi (phút)", type: "number", min: 1, max: 1440 },
  ] },
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const ac = new AbortController(); setLoading(true); setError("");
    venueRequest<AdminSettings>("/admin/settings", "GET", undefined, ac.signal)
      .then((data) => { if (!ac.signal.aborted) setForm(data); })
      .catch((e) => { if (!ac.signal.aborted) setError(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [retry]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!form || saving) return;
    setSaving(true); setError(""); setMessage("");
    try { setForm(await venueRequest<AdminSettings>("/admin/settings", "PUT", form)); setMessage("Đã lưu cấu hình vào hệ thống."); }
    catch (e) { setError(e instanceof Error ? e.message : "Không lưu được cấu hình."); }
    finally { setSaving(false); }
  }
  return <div>
    <DashboardHeader title="Cấu hình hệ thống" description="Quản lý thanh toán, tích điểm và thông tin hỗ trợ." />
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
      {loading ? <p role="status" className="text-sm text-neutral-500">Đang tải cấu hình…</p> : !form ? <button className={secondaryClass} onClick={() => setRetry((n) => n + 1)}>Thử lại</button> :
      <form onSubmit={save} className="space-y-4">
        <fieldset disabled={saving} className="space-y-4">
        {groups.map((group) => <section key={group.title} className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-semibold">{group.title}</h2><p className="mt-1 text-xs leading-5 text-neutral-500">{group.description}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{group.fields.map((field) => <label key={field.key} className="space-y-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <span className="block">{field.label}</span><input className={inputClass} type={field.type || "text"}
              min={field.min} max={field.max} step={field.type ? 1 : undefined} maxLength={field.maxLength}
              required={!["hotline", "sepay_account_no"].includes(field.key)}
              value={form[field.key] ?? ""}
              onChange={(e) => setForm({ ...form, [field.key]: field.type ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })} />
          </label>)}</div>
        </section>)}
        </fieldset>
        <div className="flex justify-end"><button className={buttonClass} disabled={saving}>{saving ? "Đang lưu…" : "Lưu cấu hình"}</button></div>
      </form>}
    </div>
  </div>;
}
