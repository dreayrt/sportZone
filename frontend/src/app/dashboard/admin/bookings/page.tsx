'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, downloadAdminBookings } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Tag,
  X,
} from 'lucide-react';

interface BookingItem {
  id: number;
  booking_code: string;
  venue_id: number;
  court_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  note?: string | null;
  court_fee: number;
  addons_fee: number;
  discount_amount: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  payment_method: string;
  checked_in: boolean;
  checked_in_at?: string | null;
  created_at: string;
  venue?: { id: number; name: string; address?: string; city?: string; district?: string };
  court?: { id: number; name: string; surface_type?: string };
  voucher?: { id: number; code: string; name: string };
  booking_addons?: Array<{ addon_name: string; quantity: number; total_price: number }>;
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: 'Chờ xử lý', class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  confirmed: { label: 'Còn hiệu lực', class: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  cancelled: { label: 'Đã hủy', class: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  no_show: { label: 'Không đến', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
};

const paymentMap: Record<string, { label: string; class: string }> = {
  paid: { label: 'Đã thanh toán', class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
  unpaid: { label: 'Chưa thanh toán', class: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
  partial: { label: 'Thanh toán 1 phần', class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  refunded: { label: 'Đã hoàn tiền', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400' },
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');

  // Detail Modal
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  const requestId = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('booking') || params.get('search');
    if (q) setSearch(q);
    const d = params.get('date');
    if (d) setDate(d);
  }, []);

  const loadBookings = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    const response = await api.admin.bookings.list({
      per_page: 15,
      page,
      search: search || undefined,
      date: date || undefined,
      status: status !== 'all' ? status : undefined,
      payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
    });

    if (id !== requestId.current) return;
    if (response.success && response.data) {
      const data = response.data;
      if (Array.isArray(data)) {
        setBookings(data);
        setTotal(data.length);
        setLastPage(1);
      } else {
        setBookings(data.data || []);
        setTotal(data.total || 0);
        setLastPage(data.last_page || 1);
      }
      setError('');
    } else {
      setError(response.message || 'Không tải được danh sách đơn đặt sân.');
    }
    setIsLoading(false);
  }, [page, search, date, status, paymentStatus]);

  useEffect(() => {
    const timer = setTimeout(() => void loadBookings(), 250);
    return () => {
      clearTimeout(timer);
      requestId.current++;
    };
  }, [loadBookings]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadAdminBookings({
        search: search || undefined,
        date: date || undefined,
        status: status !== 'all' ? status : undefined,
        payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
      });
    } catch (e: any) {
      alert(e.message || 'Không thể xuất báo cáo.');
    } finally {
      setIsExporting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Đơn Đặt Toàn Sàn"
        description="Tra cứu và giám sát toàn bộ đơn đặt sân và thanh toán của khách hàng trên toàn quốc."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Đang xuất...' : 'Xuất Excel / CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadBookings()}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* BỘ LỌC ĐA TIÊU CHÍ */}
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Tìm kiếm đơn đặt"
            placeholder="Tìm theo mã đơn SZ-..., tên khách, SĐT..."
            maxLength={150}
            className={`${inputClass} max-w-sm`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <input
            type="date"
            aria-label="Lọc theo ngày chơi"
            className={`${inputClass} max-w-44`}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Lọc trạng thái đơn"
            className={`${inputClass} max-w-44`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="confirmed">Còn hiệu lực</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
            <option value="pending">Chờ xử lý</option>
          </select>

          <select
            aria-label="Lọc trạng thái thanh toán"
            className={`${inputClass} max-w-44`}
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả thanh toán</option>
            <option value="paid">Đã thanh toán đủ</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>

          {(search || date || status !== 'all' || paymentStatus !== 'all') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearch('');
                setDate('');
                setStatus('all');
                setPaymentStatus('all');
                setPage(1);
              }}
            >
              Xóa lọc
            </Button>
          )}
        </div>

        {/* BẢNG ĐƠN ĐẶT */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-neutral-500">Đang tải danh sách đơn đặt sân...</div>
            ) : bookings.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <CalendarCheck className="w-10 h-10 text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500">Không tìm thấy đơn đặt sân nào phù hợp.</p>
              </div>
            ) : (
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-xs text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">Mã đơn</th>
                    <th className="px-5 py-3">Khách hàng</th>
                    <th className="px-5 py-3">Cơ sở & Sân đấu</th>
                    <th className="px-5 py-3">Thời gian thi đấu</th>
                    <th className="px-5 py-3">Tổng tiền</th>
                    <th className="px-5 py-3">Trạng thái đơn</th>
                    <th className="px-5 py-3">Thanh toán</th>
                    <th className="px-5 py-3">Check-in</th>
                    <th className="px-5 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                      <td className="px-5 py-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {b.booking_code}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-neutral-900 dark:text-white">{b.customer_name}</p>
                        <p className="text-xs text-neutral-500">{b.customer_phone}</p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-neutral-900 dark:text-white">
                          {b.venue?.name || `Cơ sở #${b.venue_id}`}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {b.court?.name || `Sân #${b.court_id}`}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium">{new Date(b.booking_date).toLocaleDateString('vi-VN')}</span>
                        <br />
                        <span className="text-neutral-500">
                          {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {formatVND(b.total_price)}
                        </span>
                        {b.discount_amount > 0 && (
                          <p className="text-[11px] text-emerald-600">
                            - {formatVND(b.discount_amount)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            statusMap[b.status]?.class || 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {statusMap[b.status]?.label || b.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            paymentMap[b.payment_status]?.class || 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {paymentMap[b.payment_status]?.label || b.payment_status}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {b.checked_in ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã đến sân
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">Chưa đến</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setSelectedBooking(b)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem
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
            {total} đơn đặt sân · Trang {page}/{lastPage}
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

      {/* MODAL CHI TIẾT ĐƠN */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                  Chi tiết đơn #{selectedBooking.booking_code}
                </h3>
                <p className="text-xs text-neutral-500">
                  Tạo lúc {new Date(selectedBooking.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-neutral-500 block">Khách hàng</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{selectedBooking.customer_name}</span>
                  <span className="block text-neutral-500">{selectedBooking.customer_phone}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Cơ sở & Sân đấu</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedBooking.venue?.name || 'N/A'}
                  </span>
                  <span className="block text-neutral-500">{selectedBooking.court?.name}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Ngày đặt & Giờ chơi</span>
                  <span className="font-medium">
                    {new Date(selectedBooking.booking_date).toLocaleDateString('vi-VN')} ({selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500">Tiền thuê sân</span>
                  <span>{formatVND(selectedBooking.court_fee)}</span>
                </div>
                {selectedBooking.addons_fee > 0 && (
                  <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-neutral-500">Dịch vụ đi kèm</span>
                    <span>{formatVND(selectedBooking.addons_fee)}</span>
                  </div>
                )}
                {selectedBooking.discount_amount > 0 && (
                  <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-emerald-600 font-medium">
                    <span>Voucher ({selectedBooking.voucher?.code || 'Giảm giá'})</span>
                    <span>- {formatVND(selectedBooking.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-bold text-sm text-neutral-900 dark:text-white">
                  <span>Tổng thanh toán</span>
                  <span className="text-emerald-600">{formatVND(selectedBooking.total_price)}</span>
                </div>
              </div>

              {selectedBooking.note && (
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-xs">
                  <span className="font-medium block text-neutral-500">Ghi chú của khách:</span>
                  <p className="mt-0.5 text-neutral-800 dark:text-neutral-200">{selectedBooking.note}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedBooking(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

