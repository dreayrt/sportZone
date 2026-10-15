"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStoredToken } from "@/lib/api";
import {
  Filters,
  Page,
  Venue,
  venueRequest,
  queryString,
} from "@/lib/venues-api";
import {
  VenueCard,
  Notice,
  inputClass,
  buttonClass,
  secondaryClass,
} from "./Shared";
import VenueMap from "./VenueMap";
export default function Directory({ mapView = false }: { mapView?: boolean }) {
  const initial = useSearchParams();
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    search: initial.get("search") || "",
    city: initial.get("city") || "",
    district: initial.get("district") || "",
    sport: initial.get("sport") || "",
    min_price: "",
    max_price: "",
    rating: "",
    sort: "name",
    lat: "",
    lng: "",
    radius: "20",
  }));
  const [applied, setApplied] = useState<Record<string, string>>({
    ...filters,
    radius: "",
  });
  const [options, setOptions] = useState<Filters>({
    locations: [],
    sports: [],
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Venue> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState(false);
  const [selected, setSelected] = useState<Venue | null>(null);
  const searched = useRef(false);
  const [geoBusy, setGeoBusy] = useState(false);
  useEffect(() => {
    venueRequest<Filters>("/venues/filters")
      .then(setOptions)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    venueRequest<Page<Venue>>(
      `/venues?${queryString({ ...applied, page, per_page: mapView ? 50 : 12 })}`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((result) => {
        setData(result);
        if (searched.current && getStoredToken()) {
          searched.current = false;
          const sport = options.sports.find((s) => s.code === applied.sport);
          venueRequest("/search-history", "POST", {
            search_query: applied.search || null,
            city: applied.city || null,
            district: applied.district || null,
            sport_category_id: sport?.id || null,
            filters_json: applied,
            result_count: result.total,
          }).catch(() => {});
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setData(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, page, mapView, options.sports]);
  const change = (key: string, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "city" ? { district: "" } : {}),
    }));
  const select = useCallback((v: Venue) => setSelected(v), []);
  const near = () => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ lấy vị trí.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFilters((f) => ({
          ...f,
          lat: String(p.coords.latitude),
          lng: String(p.coords.longitude),
          sort: "nearest",
        }));
        setGeoBusy(false);
      },
      () => {
        setError(
          "Không lấy được vị trí. Hãy cho phép truy cập vị trí rồi thử lại.",
        );
        setGeoBusy(false);
      },
      { timeout: 10000 },
    );
  };
  const cities = Array.from(new Set(options.locations.map((l) => l.city)));
  const districts = Array.from(
    new Set(
      options.locations
        .filter((l) => !filters.city || l.city === filters.city)
        .map((l) => l.district),
    ),
  );
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sport-600 text-xs uppercase tracking-widest font-bold">
            Tìm nơi chơi của bạn
          </p>
          <h1 className="text-3xl font-bold mt-2">
            {mapView ? "Bản đồ tìm sân" : "Cơ sở & sân thể thao"}
          </h1>
        </div>
        <Link
          className={secondaryClass}
          href={mapView ? "/venues" : "/venues/map"}
        >
          {mapView ? "Danh sách sân" : "Xem bản đồ"}
        </Link>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (filters.sort === "nearest" && !filters.lat) {
            setError("Bấm Lấy vị trí trước khi chọn Gần nhất.");
            return;
          }
          searched.current = true;
          setPage(1);
          setSelected(null);
          setApplied({
            ...filters,
            ...(!filters.lat ? { lat: "", lng: "", radius: "" } : {}),
          });
        }}
        className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-xs space-y-1">
            Tên sân / địa chỉ
            <input
              className={inputClass}
              placeholder="Tìm tên sân, quận…"
              value={filters.search}
              onChange={(e) => change("search", e.target.value)}
            />
          </label>
          <label className="text-xs space-y-1">
            Thành phố
            <select
              className={inputClass}
              value={filters.city}
              onChange={(e) => change("city", e.target.value)}
            >
              <option value="">Tất cả thành phố</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            Quận / huyện
            <select
              className={inputClass}
              value={filters.district}
              onChange={(e) => change("district", e.target.value)}
            >
              <option value="">Tất cả quận</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            Môn thể thao
            <select
              className={inputClass}
              value={filters.sport}
              onChange={(e) => change("sport", e.target.value)}
            >
              <option value="">Tất cả môn</option>
              {options.sports.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            Giá thường tối thiểu / giờ
            <input
              className={inputClass}
              type="number"
              min="0"
              value={filters.min_price}
              onChange={(e) => change("min_price", e.target.value)}
              placeholder="Không giới hạn"
            />
          </label>
          <label className="text-xs space-y-1">
            Giá thường tối đa / giờ
            <input
              className={inputClass}
              type="number"
              min="0"
              value={filters.max_price}
              onChange={(e) => change("max_price", e.target.value)}
              placeholder="Không giới hạn"
            />
          </label>
          <label className="text-xs space-y-1">
            Đánh giá tối thiểu
            <select
              className={inputClass}
              value={filters.rating}
              onChange={(e) => change("rating", e.target.value)}
            >
              <option value="">Tất cả đánh giá</option>
              {[3, 4, 4.5].map((n) => (
                <option key={n} value={n}>
                  {n} sao trở lên
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs space-y-1">
            Sắp xếp
            <select
              className={inputClass}
              value={filters.sort}
              onChange={(e) => change("sort", e.target.value)}
            >
              <option value="name">Tên cơ sở</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="rating">Đánh giá cao</option>
              <option value="popular">Nhiều lượt đặt</option>
              <option value="nearest">Gần nhất</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button className={buttonClass} disabled={loading}>
            Tìm sân
          </button>
          <button
            type="button"
            className={secondaryClass}
            disabled={geoBusy}
            onClick={near}
          >
            {geoBusy ? "Đang lấy vị trí…" : "Lấy vị trí của tôi"}
          </button>
          {filters.lat && (
            <>
              <span className="text-xs text-sport-700">Đã lấy vị trí</span>
              <label className="text-xs">
                Bán kính (km)
                <input
                  aria-label="Bán kính tìm kiếm"
                  className="border rounded-lg ml-2 p-2 w-20 bg-transparent"
                  type="number"
                  min="1"
                  max="500"
                  value={filters.radius}
                  onChange={(e) => change("radius", e.target.value)}
                />
              </label>
              <button
                type="button"
                className={secondaryClass}
                onClick={() =>
                  setFilters((f) => ({ ...f, lat: "", lng: "", sort: "name" }))
                }
              >
                Bỏ vị trí
              </button>
            </>
          )}
        </div>
      </form>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Notice>Đang tải cơ sở…</Notice>
      ) : (
        data && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-neutral-500">
                {data.total} cơ sở phù hợp
              </p>
              {!mapView && (
                <button
                  className={secondaryClass}
                  onClick={() => setList(!list)}
                >
                  {list ? "Dạng lưới" : "Dạng danh sách"}
                </button>
              )}
            </div>
            {mapView && (
              <>
                <VenueMap venues={data.data} onSelect={select} />
                <p className="text-xs text-neutral-500">
                  Bấm ghim để xem cơ sở. Bản đồ hiển thị cơ sở có tọa độ trong
                  trang kết quả hiện tại.
                </p>
                {selected && <VenueCard venue={selected} list />}
              </>
            )}
            {!data.data.length ? (
              <Notice>Không có cơ sở phù hợp. Hãy thử thay đổi bộ lọc.</Notice>
            ) : (
              <div
                className={
                  list
                    ? "space-y-4"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                }
              >
                {data.data.map((v) => (
                  <VenueCard key={v.id} venue={v} list={list} />
                ))}
              </div>
            )}
            <div className="flex justify-center items-center gap-4">
              <button
                className={secondaryClass}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Trước
              </button>
              <span className="text-sm">
                {data.current_page} / {data.last_page}
              </span>
              <button
                className={secondaryClass}
                disabled={page >= data.last_page}
                onClick={() => setPage(page + 1)}
              >
                Sau
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
