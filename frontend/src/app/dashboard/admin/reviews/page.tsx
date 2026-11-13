'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, AdminReviewItem } from '@/lib/api';
import { Eye, EyeOff, MessageSquare, Star, Building2, User, RefreshCw } from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const requestId = useRef(0);

  const loadReviews = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    const response = await api.admin.reviews.list({
      per_page: 15,
      page,
      keyword,
      status: statusFilter || undefined,
      rating: ratingFilter ? Number(ratingFilter) : undefined,
    });

    if (id !== requestId.current) return;
    if (response.success && response.data) {
      setReviews(response.data.data || []);
      setLastPage(response.data.last_page || 1);
      setTotal(response.data.total || 0);
      if (page > (response.data.last_page || 1)) setPage(response.data.last_page || 1);
      setError('');
    } else {
      setError(response.message || 'Không tải được danh sách đánh giá.');
    }
    setIsLoading(false);
  }, [page, keyword, statusFilter, ratingFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void loadReviews(), 250);
    return () => {
      clearTimeout(timer);
      requestId.current++;
    };
  }, [loadReviews]);

  const toggleStatus = async (review: AdminReviewItem) => {
    const nextStatus = review.status === 'visible' ? 'hidden' : 'visible';
    const actionLabel = nextStatus === 'hidden' ? 'ẩn' : 'hiển thị lại';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} đánh giá này?`)) return;

    setUpdatingId(review.id);
    setError('');
    setNotice('');

    const res = await api.admin.reviews.updateStatus(review.id, nextStatus);
    if (res.success) {
      setNotice(`Đã ${actionLabel} đánh giá thành công.`);
      await loadReviews();
    } else {
      setError(res.message || 'Không thể cập nhật trạng thái đánh giá.');
    }
    setUpdatingId(null);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div>
      <DashboardHeader
        title="Kiểm Duyệt Đánh Giá"
        description="Quản lý và kiểm duyệt các đánh giá, phản hồi của khách hàng về các cơ sở sân trên toàn hệ thống."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void loadReviews()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {/* BỘ LỌC */}
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Tìm đánh giá"
            placeholder="Tìm theo nội dung, tên khách hoặc cơ sở..."
            maxLength={150}
            className={`${inputClass} max-w-sm`}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Lọc trạng thái"
            className={`${inputClass} max-w-44`}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </select>

          <select
            aria-label="Lọc số sao"
            className={`${inputClass} max-w-36`}
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả sao</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
            <option value="4">⭐⭐⭐⭐ (4 sao)</option>
            <option value="3">⭐⭐⭐ (3 sao)</option>
            <option value="2">⭐⭐ (2 sao)</option>
            <option value="1">⭐ (1 sao)</option>
          </select>
        </div>

        {/* BẢNG ĐÁNH GIÁ */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-neutral-500">Đang tải đánh giá...</div>
            ) : reviews.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500">Không có đánh giá nào phù hợp với bộ lọc.</p>
              </div>
            ) : (
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-xs text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">Khách hàng</th>
                    <th className="px-5 py-3">Cơ sở sân</th>
                    <th className="px-5 py-3">Đánh giá & Bình luận</th>
                    <th className="px-5 py-3">Mã đơn</th>
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-600">
                            {r.user?.avatar ? (
                              <img src={r.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">
                              {r.customer_name || r.user?.full_name || 'Khách hàng'}
                            </p>
                            {r.user?.email && <p className="text-xs text-neutral-400">{r.user.email}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-start gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {r.venue?.name || `Cơ sở #${r.venue_id}`}
                            </p>
                            {r.venue?.district && (
                              <p className="text-xs text-neutral-500">
                                {r.venue.district}, {r.venue.city}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-md">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < r.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-neutral-200 dark:text-neutral-700'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                            {r.rating}/5
                          </span>
                        </div>
                        <p className="text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed line-clamp-3">
                          {r.comment || <span className="italic text-neutral-400">Không có bình luận chữ</span>}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-medium text-neutral-600 dark:text-neutral-400">
                          {r.booking?.booking_code || `#${r.booking_id ?? '—'}`}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            r.status === 'visible'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          }`}
                        >
                          {r.status === 'visible' ? 'Đang hiển thị' : 'Đã ẩn'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={r.status === 'visible' ? 'outline' : 'primary'}
                          disabled={updatingId === r.id}
                          className="gap-1.5"
                          onClick={() => void toggleStatus(r)}
                        >
                          {r.status === 'visible' ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                              Ẩn đánh giá
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Hiện lại
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* PHÂN TRANG */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <span>
            {total} đánh giá · Trang {page}/{lastPage}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => setPage((n) => n - 1)}>
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || page >= lastPage}
              onClick={() => setPage((n) => n + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

