'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { MOCK_BOOKINGS, Booking } from '@/lib/mock-data';
import { api } from '@/lib/api';
import {
  CalendarDays,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  AlertTriangle,
  FileText,
  RotateCcw
} from 'lucide-react';

export default function CustomerBookingsPage() {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('Bận việc đột xuất');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load from Backend API
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await api.bookings.getAll();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setBookings(res.data);
      }
    } catch {
      // Keep MOCK_BOOKINGS
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;

    setIsCancelling(true);
    try {
      const res = await api.bookings.cancel(cancellingBooking.id, cancelReason);
      if (res.success) {
        setBookings(prev =>
          prev.map(b => b.id === cancellingBooking.id ? { ...b, status: 'cancelled', cancel_reason: cancelReason } : b)
        );
        alert('Đã hủy đơn đặt sân thành công!');
        setCancellingBooking(null);
      } else {
        alert(res.message || 'Không thể hủy đơn đặt.');
      }
    } catch {
      // Fallback
      setBookings(prev =>
        prev.map(b => b.id === cancellingBooking.id ? { ...b, status: 'cancelled', cancel_reason: cancelReason } : b)
      );
      setCancellingBooking(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  return (
    <div>
      <DashboardHeader
        title="Lịch Sử Đặt Sân & Vé Check-in"
        description="Quản lý toàn bộ danh sách các trận đấu bạn đã đặt, xuất vé mã QR và tra cứu lịch thi đấu."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filter Tabs & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Tất cả ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'confirmed'
                  ? 'bg-white dark:bg-neutral-800 text-sport-600 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Sắp diễn ra
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'completed'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-600 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Đã hoàn thành
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'cancelled'
                  ? 'bg-white dark:bg-neutral-800 text-red-600 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Đã hủy
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchBookings} className="text-xs gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              Làm Mới
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              In Vé / Xuất PDF
            </Button>
          </div>
        </div>

        {/* Bookings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <Card key={b.id} hoverEffect className="relative overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      {b.booking_code}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                      {b.court?.name}
                    </h3>
                    <p className="text-xs text-neutral-500">{b.venue?.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.checked_in && (
                      <Badge variant="success" size="sm">Đã Check-in</Badge>
                    )}
                    <Badge variant={
                      b.status === 'confirmed' ? 'sport' :
                      b.status === 'completed' ? 'success' : 'neutral'
                    }>
                      {b.status === 'confirmed' ? 'Sắp diễn ra' :
                       b.status === 'completed' ? 'Đã hoàn thành' : 'Đã hủy'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-neutral-100 dark:border-neutral-800/80 text-xs">
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <CalendarDays className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                    <span>{formatDate(b.booking_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Clock className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                    <span>{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 col-span-2">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{b.venue?.address}, {b.venue?.district}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Tổng thanh toán</span>
                    <span className="text-base font-bold font-mono text-sport-600">
                      {formatVND(b.total_price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancellingBooking(b)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900"
                      >
                        Hủy Đơn
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedBooking(b)}
                      className="text-xs gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Vé QR Check-in
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredBookings.length === 0 && (
            <div className="col-span-2 p-12 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
              Chưa có đơn đặt sân nào trong mục này.
            </div>
          )}
        </div>

        {/* QR & Detail Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-5 text-center shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <span className="font-mono text-xs font-semibold text-neutral-500">THẺ VÀO SÂN (CHECK-IN)</span>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              {/* QR box */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center space-y-3">
                <div className="w-44 h-44 bg-white p-2 rounded-lg border border-neutral-200 shadow-xs flex items-center justify-center">
                  <img
                    src={`https://api.vietqr.io/image/970436-0123456789-Q4fJkZ3.jpg?accountName=SPORTZONE%20CHECKIN&amount=${selectedBooking.total_price}&addInfo=${selectedBooking.booking_code}`}
                    alt="Booking QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-base font-mono font-bold tracking-widest text-neutral-900 dark:text-white">
                  {selectedBooking.booking_code}
                </span>
                {selectedBooking.checked_in && (
                  <Badge variant="success">Đã điểm danh vào sân</Badge>
                )}
              </div>

              <div className="text-left text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300">
                <p><strong>Người đặt:</strong> {selectedBooking.customer_name} ({selectedBooking.customer_phone})</p>
                <p><strong>Sân:</strong> {selectedBooking.court?.name}</p>
                <p><strong>Địa chỉ:</strong> {selectedBooking.venue?.address}, {selectedBooking.venue?.city}</p>
                <p><strong>Khung giờ:</strong> {selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)} ngày {formatDate(selectedBooking.booking_date)}</p>
                <p><strong>Tổng tiền:</strong> <span className="font-mono font-bold text-sport-600">{formatVND(selectedBooking.total_price)}</span> ({selectedBooking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'})</p>
                <p className="text-neutral-400 text-[11px] pt-1">Xuất trình mã này cho nhân viên lễ tân tại sân để quét xác nhận.</p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setSelectedBooking(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {cancellingBooking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Xác Nhận Hủy Đơn Đặt Sân</span>
              </div>

              <p className="text-xs text-neutral-500">
                Bạn có chắc chắn muốn hủy đơn <strong>{cancellingBooking.booking_code}</strong> vào lúc {cancellingBooking.start_time.slice(0, 5)} ngày {formatDate(cancellingBooking.booking_date)}?
              </p>

              <form onSubmit={handleCancelBooking} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Lý do hủy đơn *
                  </label>
                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="VD: Bận việc đột xuất, thời tiết xấu..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCancellingBooking(null)}
                  >
                    Bỏ Qua
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isCancelling}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isCancelling ? 'Đang Hủy...' : 'Xác Nhận Hủy'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
