"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Filters, Venue, Sport, venueRequest } from "@/lib/venues-api";
import {
  Notice,
  OwnerGuard,
  inputClass,
  buttonClass,
  secondaryClass,
} from "./Shared";
import { formatVND } from "@/lib/utils";
type Kind = "venues" | "courts" | "addons";
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
};
const defaults: Record<Kind, Record<string, any>> = {
  venues: {
    name: "",
    description: "",
    address: "",
    ward: "",
    district: "",
    city: "",
    phone: "",
    email: "",
    open_time: "06:00",
    close_time: "23:00",
    latitude: "",
    longitude: "",
    status: "active",
    image: "",
    gallery: [],
  },
  courts: {
    venue_id: "",
    sport_category_id: "",
    name: "",
    surface_type: "",
    indoor: true,
    capacity: 4,
    hourly_rate_standard: 90000,
    hourly_rate_peak: 120000,
    peak_start: "17:00",
    peak_end: "21:00",
    min_booking_minutes: 60,
    slot_minutes: 30,
    description: "",
    image: "",
    status: "active",
  },
  addons: {
    venue_id: "",
    name: "",
    category: "drink",
    price: 10000,
    unit: "chai",
    stock_quantity: "",
    image: "",
    status: "active",
  },
};
export default function OwnerManager({ kind }: { kind: Kind }) {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">
      <OwnerGuard>
        <Manager kind={kind} />
      </OwnerGuard>
    </div>
  );
}
function Amenities({ venue, onSaved }: { venue: Venue; onSaved: () => void }) {
  const [id, setId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await venueRequest(
        id ? `/owner/amenities/${id}` : `/owner/venues/${venue.id}/amenities`,
        id ? "PUT" : "POST",
        { name },
      );
      setId(null);
      setName("");
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (a: number) => {
    if (!confirm("Xóa tiện ích này?")) return;
    setBusy(true);
    try {
      await venueRequest(`/owner/amenities/${a}`, "DELETE");
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-t pt-4 mt-4 space-y-3">
      <h3 className="font-semibold text-sm">Tiện ích</h3>
      {error && <Notice error>{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        {venue.amenities?.map((a) => (
          <span
            key={a.id}
            className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2 text-xs flex gap-2 items-center"
          >
            {a.name}
            <button
              disabled={busy}
              className="underline"
              onClick={() => {
                setId(a.id);
                setName(a.name);
              }}
            >
              Sửa
            </button>
            <button
              disabled={busy}
              className="text-red-600"
              onClick={() => remove(a.id)}
            >
              Xóa
            </button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={save}>
        <input
          aria-label="Tên tiện ích"
          className={inputClass}
          value={name}
          required
          maxLength={150}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Bãi giữ xe"
        />
        <button className={buttonClass} disabled={busy}>
          {id ? "Lưu" : "Thêm"}
        </button>
        {id && (
          <button
            type="button"
            className={secondaryClass}
            onClick={() => {
              setId(null);
              setName("");
            }}
          >
            Hủy
          </button>
        )}
      </form>
    </div>
  );
}
function Manager({ kind }: { kind: Kind }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const title =
    kind === "venues"
      ? "Cơ sở & tiện ích"
      : kind === "courts"
        ? "Quản lý sân"
        : "Dịch vụ đi kèm";
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      venueRequest<Venue[]>("/owner/venues", "GET", undefined, ac.signal),
      venueRequest<Filters>("/venues/filters", "GET", undefined, ac.signal),
      kind === "venues"
        ? Promise.resolve([])
        : venueRequest<any[]>(`/owner/${kind}`, "GET", undefined, ac.signal),
    ])
      .then(([v, f, list]) => {
        setVenues(v);
        setSports(f.sports);
        setItems(kind === "venues" ? v : list);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [kind, reload]);
  const venueOptions = venues.map((v) => ({ value: v.id, label: v.name }));
  const active = [
    { value: "active", label: "Hoạt động" },
    { value: "inactive", label: "Ngừng hoạt động" },
  ];
  const fields: Field[] =
    kind === "venues"
      ? [
          { key: "name", label: "Tên cơ sở", required: true },
          { key: "phone", label: "Số điện thoại", required: true },
          { key: "email", label: "Email", type: "email" },
          { key: "address", label: "Địa chỉ", required: true },
          { key: "ward", label: "Phường / xã" },
          { key: "district", label: "Quận / huyện", required: true },
          { key: "city", label: "Thành phố", required: true },
          {
            key: "open_time",
            label: "Giờ mở cửa",
            type: "time",
            required: true,
          },
          {
            key: "close_time",
            label: "Giờ đóng cửa",
            type: "time",
            required: true,
          },
          {
            key: "latitude",
            label: "Vĩ độ",
            type: "number",
            min: -90,
            max: 90,
          },
          {
            key: "longitude",
            label: "Kinh độ",
            type: "number",
            min: -180,
            max: 180,
          },
          {
            key: "status",
            label: "Trạng thái",
            options: [...active, { value: "pending", label: "Chờ xử lý" }],
            required: true,
          },
          { key: "description", label: "Mô tả", type: "textarea" },
          { key: "image", label: "URL ảnh đại diện", type: "url" },
          {
            key: "gallery",
            label: "Gallery (mỗi dòng một URL ảnh)",
            type: "gallery",
          },
        ]
      : kind === "courts"
        ? [
            {
              key: "venue_id",
              label: "Cơ sở",
              options: venueOptions,
              required: true,
            },
            {
              key: "sport_category_id",
              label: "Môn thể thao",
              options: sports.map((s) => ({ value: s.id, label: s.name })),
              required: true,
            },
            { key: "name", label: "Tên sân", required: true },
            { key: "surface_type", label: "Loại mặt sân", required: true },
            { key: "indoor", label: "Sân trong nhà", type: "checkbox" },
            { key: "capacity", label: "Sức chứa", type: "number", min: 1 },
            {
              key: "hourly_rate_standard",
              label: "Giá thường / giờ (VNĐ)",
              type: "number",
              min: 0,
              required: true,
            },
            {
              key: "hourly_rate_peak",
              label: "Giá cao điểm / giờ (VNĐ)",
              type: "number",
              min: 0,
              required: true,
            },
            {
              key: "peak_start",
              label: "Bắt đầu cao điểm",
              type: "time",
              required: true,
            },
            {
              key: "peak_end",
              label: "Kết thúc cao điểm",
              type: "time",
              required: true,
            },
            {
              key: "min_booking_minutes",
              label: "Thời gian đặt tối thiểu (phút)",
              type: "number",
              min: 15,
              required: true,
            },
            {
              key: "slot_minutes",
              label: "Độ dài slot (phút)",
              type: "number",
              min: 15,
              max: 240,
              required: true,
            },
            {
              key: "status",
              label: "Trạng thái",
              required: true,
              options: [
                { value: "active", label: "Hoạt động" },
                { value: "maintenance", label: "Bảo trì" },
                { value: "closed", label: "Đóng cửa" },
              ],
            },
            { key: "description", label: "Mô tả", type: "textarea" },
            { key: "image", label: "URL ảnh", type: "url" },
          ]
        : [
            {
              key: "venue_id",
              label: "Cơ sở",
              options: venueOptions,
              required: true,
            },
            { key: "name", label: "Tên dịch vụ", required: true },
            {
              key: "category",
              label: "Loại",
              required: true,
              options: [
                { value: "drink", label: "Đồ uống" },
                { value: "equipment", label: "Dụng cụ" },
                { value: "service", label: "Dịch vụ" },
              ],
            },
            {
              key: "price",
              label: "Giá (VNĐ)",
              type: "number",
              min: 0,
              required: true,
            },
            { key: "unit", label: "Đơn vị", required: true },
            {
              key: "stock_quantity",
              label: "Tồn kho (bỏ trống nếu không quản lý)",
              type: "number",
              min: 0,
            },
            {
              key: "status",
              label: "Trạng thái",
              options: active,
              required: true,
            },
            { key: "image", label: "URL ảnh", type: "url" },
          ];
  const edit = (item?: any) => {
    setError("");
    setMessage("");
    setForm(
      item
        ? {
            ...defaults[kind],
            ...item,
            ...Object.fromEntries(
              fields
                .filter((f) => f.type === "time")
                .map((f) => [
                  f.key,
                  (item[f.key] || defaults[kind][f.key]).slice(0, 5),
                ]),
            ),
          }
        : {
            ...defaults[kind],
            ...(kind !== "venues"
              ? {
                  venue_id: selectedVenue || venues[0]?.id || "",
                  sport_category_id: sports[0]?.id || "",
                }
              : {}),
          },
    );
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    const body: Record<string, any> = {};
    fields.forEach((f) => {
      const value = form[f.key];
      body[f.key] =
        f.type === "gallery"
          ? (value || []).map((url: string) => url.trim()).filter(Boolean)
          : value === "" || value === undefined
            ? null
            : f.type === "number" || f.key.endsWith("_id")
              ? Number(value)
              : value;
    });
    try {
      await venueRequest(
        `/owner/${kind}${form.id ? `/${form.id}` : ""}`,
        form.id ? "PUT" : "POST",
        body,
      );
      setForm(null);
      setMessage("Đã lưu vào cơ sở dữ liệu.");
      setReload((n) => n + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (item: any) => {
    if (!confirm(`Xóa ${item.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await venueRequest(`/owner/${kind}/${item.id}`, "DELETE");
      setReload((n) => n + 1);
      setMessage("Đã xóa.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File, gallery = false) => {
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("image", file);
      const result = await venueRequest<{ url: string }>(
        "/owner/images",
        "POST",
        data,
      );
      setForm((f) =>
        f
          ? {
              ...f,
              ...(gallery
                ? { gallery: [...(f.gallery || []), result.url] }
                : { image: result.url }),
            }
          : f,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const geocode = async () => {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const result = await venueRequest<{
        latitude: number;
        longitude: number;
      }>("/owner/geocode", "POST", {
        address: [form.address, form.ward, form.district, form.city]
          .filter(Boolean)
          .join(", "),
      });
      setForm((f) => (f ? { ...f, ...result } : f));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const filtered = items.filter(
    (i) =>
      (!selectedVenue ||
        String(kind === "venues" ? i.id : i.venue_id) === selectedVenue) &&
      (!statusFilter || i.status === statusFilter) &&
      (!sportFilter || String(i.sport_category_id) === sportFilter),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs text-sport-600 font-bold uppercase">
            Không gian chủ sân
          </p>
          <h1 className="text-2xl font-bold mt-2">{title}</h1>
        </div>
        <button
          className={buttonClass}
          disabled={loading || busy || (kind !== "venues" && !venues.length)}
          onClick={() => edit()}
        >
          + Thêm{" "}
          {kind === "venues" ? "cơ sở" : kind === "courts" ? "sân" : "dịch vụ"}
        </button>
      </div>
      <nav className="flex flex-wrap gap-3 text-sm">
        {[
          ["venues", "Cơ sở & tiện ích"],
          ["courts", "Sân đấu"],
          ["addons", "Dịch vụ"],
          ["venues/calendar", "Lịch sân"],
        ].map(([path, label]) => (
          <Link
            key={path}
            href={`/dashboard/owner/${path}`}
            className={secondaryClass}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {kind === "venues" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Cơ sở", venues.length],
            [
              "Đang hoạt động",
              venues.filter((v) => v.status === "active").length,
            ],
            [
              "Sân",
              venues.reduce((sum, v) => sum + (v.courts?.length || 0), 0),
            ],
            [
              "Tiện ích",
              venues.reduce((sum, v) => sum + (v.amenities?.length || 0), 0),
            ],
          ].map(([label, n]) => (
            <div
              key={label}
              className="p-5 bg-white dark:bg-neutral-900 rounded-xl border"
            >
              <p className="text-xs text-neutral-500">{label}</p>
              <strong className="text-3xl block mt-2">{n}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Lọc cơ sở"
          className={`${inputClass} max-w-xs`}
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
        >
          <option value="">Tất cả cơ sở của tôi</option>
          {venueOptions.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
        {kind === "courts" && (
          <select
            aria-label="Lọc môn thể thao"
            className={`${inputClass} max-w-xs`}
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
          >
            <option value="">Tất cả môn</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Lọc trạng thái"
          className={`${inputClass} max-w-xs`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {fields
            .find((f) => f.key === "status")
            ?.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      </div>
      {loading ? (
        <Notice>Đang tải…</Notice>
      ) : !filtered.length ? (
        <Notice>
          Chưa có dữ liệu phù hợp.{" "}
          {kind !== "venues" && !venues.length
            ? "Hãy tạo cơ sở trước."
            : "Bạn có thể thêm mới bằng nút phía trên."}
        </Notice>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-40 object-cover rounded-xl"
                />
              )}
              <div className="flex justify-between gap-3">
                <h2 className="font-bold text-lg">{item.name}</h2>
                <span className="text-xs rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
                  {
                    fields
                      .find((f) => f.key === "status")
                      ?.options?.find((o) => o.value === item.status)?.label
                  }
                </span>
              </div>
              <p className="text-xs text-neutral-400">{item.code}</p>
              {kind === "venues" ? (
                <>
                  <p className="text-sm">
                    {item.address}, {item.district}, {item.city}
                  </p>
                  <p className="text-sm">
                    {item.open_time?.slice(0, 5)}–{item.close_time?.slice(0, 5)}{" "}
                    · {item.phone}
                  </p>
                  <Link
                    className="text-sport-700 text-sm"
                    href={`/venues/${item.slug}`}
                  >
                    Xem trang công khai →
                  </Link>
                </>
              ) : kind === "courts" ? (
                <>
                  <p className="text-sm">
                    {venues.find((v) => v.id === item.venue_id)?.name} ·{" "}
                    {item.sport_category?.name}
                  </p>
                  <p className="text-sm">
                    Giá thường {formatVND(item.hourly_rate_standard)} / giờ ·
                    Cao điểm {formatVND(item.hourly_rate_peak)} / giờ
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm">
                    {venues.find((v) => v.id === item.venue_id)?.name}
                  </p>
                  <p className="text-sm">
                    {formatVND(item.price)} / {item.unit} · Tồn kho:{" "}
                    {item.stock_quantity ?? "Không quản lý"}
                  </p>
                </>
              )}
              <div className="flex gap-2">
                <button
                  className={secondaryClass}
                  disabled={busy}
                  onClick={() => edit(item)}
                >
                  Chỉnh sửa
                </button>
                <button
                  className={`${secondaryClass} text-red-600`}
                  disabled={busy}
                  onClick={() => remove(item)}
                >
                  Xóa
                </button>
              </div>
              {kind === "venues" && (
                <Amenities
                  venue={item}
                  onSaved={() => setReload((n) => n + 1)}
                />
              )}
            </article>
          ))}
        </div>
      )}
      {form && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Chỉnh sửa ${title}`}
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto p-4 flex items-start justify-center"
        >
          <div className="my-8 bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-xl">
                {form.id ? "Chỉnh sửa" : "Tạo mới"} · {title}
              </h2>
              <button
                disabled={busy}
                aria-label="Đóng form"
                className={secondaryClass}
                onClick={() => setForm(null)}
              >
                Đóng
              </button>
            </div>
            {error && <Notice error>{error}</Notice>}
            <form onSubmit={save} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <label
                    key={field.key}
                    className={`text-xs block space-y-1 ${["textarea", "gallery"].includes(field.type || "") ? "sm:col-span-2" : ""}`}
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                    {field.options ? (
                      <select
                        className={inputClass}
                        required={field.required}
                        value={form[field.key] ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, [field.key]: e.target.value })
                        }
                      >
                        <option value="">Chọn…</option>
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        className="block w-5 h-5"
                        checked={!!form[field.key]}
                        onChange={(e) =>
                          setForm({ ...form, [field.key]: e.target.checked })
                        }
                      />
                    ) : ["textarea", "gallery"].includes(field.type || "") ? (
                      <textarea
                        className={inputClass}
                        rows={3}
                        value={
                          field.type === "gallery"
                            ? (form.gallery || []).join("\n")
                            : (form[field.key] ?? "")
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [field.key]:
                              field.type === "gallery"
                                ? e.target.value.split("\n")
                                : e.target.value,
                          })
                        }
                      />
                    ) : (
                      <input
                        className={inputClass}
                        type={field.type || "text"}
                        step={
                          field.type === "number" &&
                          ["latitude", "longitude"].includes(field.key)
                            ? "any"
                            : undefined
                        }
                        min={field.min}
                        max={field.max}
                        required={field.required}
                        value={form[field.key] ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, [field.key]: e.target.value })
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <label className={secondaryClass}>
                  Tải ảnh đại diện
                  <input
                    className="block text-xs mt-2 max-w-52"
                    disabled={busy}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) upload(e.target.files[0]);
                    }}
                  />
                </label>
                {kind === "venues" && (
                  <>
                    <label className={secondaryClass}>
                      Thêm ảnh vào gallery
                      <input
                        className="block text-xs mt-2 max-w-52"
                        disabled={busy}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            upload(e.target.files[0], true);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className={secondaryClass}
                      disabled={busy}
                      onClick={geocode}
                    >
                      Lấy tọa độ từ địa chỉ
                    </button>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  className={secondaryClass}
                  onClick={() => setForm(null)}
                >
                  Hủy
                </button>
                <button disabled={busy} className={buttonClass}>
                  {busy ? "Đang xử lý…" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
