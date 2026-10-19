'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_BOOKINGS, MOCK_VENUES, Booking } from '@/lib/mock-data';
import { formatVND, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Plus,
  Check,
  QrCode,
  Search,
  Filter,
  Phone,
  CheckCircle2,
  Download,
  RotateCcw,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Counter Modal State
  const venue = MOCK_VENUES[0];
  const courts = venue.courts || [];
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterCourtId, setCounterCourtId] = useState<number>(courts[0]?.id || 1);
  const [counterBookingDate, setCounterBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [counterStartTime, setCounterStartTime] = useState('17:00');
  const [counterEndTime, setCounterEndTime] = useState('18:30');
  const [counterCustomerName, setCounterCustomerName] = useState('');
  const [counterCustomerPhone, setCounterCustomerPhone] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Action Check-in calling Backend API
  const handleCheckIn = async (id: number) => {
    try {
      const res = await api.bookings.checkIn(id);
      if (res.success) {
        setBookings(prev =>
          prev.map(b => b.id === id ? { ...b, checked_in: true, checked_in_at: new Date().toISOString() } : b)
        );
        alert('Điểm danh khách vào sân thành công!');
      } else {
        alert(res.message || 'Lỗi khi điểm danh.');
      }
    } catch {
      // Fallback
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, checked_in: true, checked_in_at: new Date().toISOString() } : b)
      );
      alert('Điểm danh khách vào sân thành công (Demo Mode)!');
    }
  };

  // Action Export CSV
  const handleExportCSV = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sz_auth_token') : '';
    const url = `http://127.0.0.1:8000/api/v1/owner/bookings/export?date=${new Date().toISOString().split('T')[0]}`;
    window.open(url, '_blank');
  };

  // Submit Counter Booking
  const handleCreateCounterBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.bookings.create({
        court_id: counterCourtId,
        booking_date: counterBookingDate,
        start_time: counterStartTime,
        end_time: counterEndTime,
        customer_name: counterCustomerName || 'Khách Tại Quầy',
        customer_phone: counterCustomerPhone || '0900000000',
        note: counterNote || 'Nhận khách trực tiếp tại quầy',
        payment_method: 'cash',
        payment_status: 'paid',
        source: 'counter',
      });

      if (res.success && res.data) {
        alert(`Tạo đơn tại quầy thành công! Mã đơn: ${res.data.booking_code}`);
        setBookings([res.data, ...bookings]);
        setIsCounterModalOpen(false);
        setCounterCustomerName('');
        setCounterCustomerPhone('');
      } else {
        alert(res.message || 'Lỗi tạo đơn tại quầy.');
      }
    } catch {
      alert('Tạo đơn tại quầy thành công (Demo Mode)!');
      setIsCounterModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchSearch =
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_phone?.includes(search);

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Đơn Đặt Sân & Điểm Danh (Check-in)"
        description="Theo dõi toàn bộ đơn đặt từ Website và Tại quầy, xác nhận điểm danh khách vào sân và xuất báo cáo."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Xuất Báo Cáo CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCounterModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo Đơn Tại Quầy
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Tìm theo tên khách, số điện thoại hoặc mã đơn SZ-..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'all' ? 'bg-white dark:bg-neutral-800 font-semibold shadow-xs' : 'text-neutral-500'
                }`}
              >
                Tất cả ({bookings.length})
              </button>
              <button
                onClick={() => setStatusFilter('confirmed')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'confirmed' ? 'bg-white dark:bg-neutral-800 font-semibold text-sport-600 shadow-xs' : 'text-neutral-500'
                }`}
              >
                Sắp đá
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-md transition-all ${
                  statusFilter === 'completed' ? 'bg-white dark:bg-neutral-800 font-semibold text-emerald-600 shadow-xs' : 'text-neutral-500'
                }`}
              >
                Đã đá
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={fetchBookings} className="text-xs">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Mã đơn</th>
                  <th className="py-3 px-5">Khách hàng</th>
                  <th className="py-3 px-5">Sân thi đấu</th>
                  <th className="py-3 px-5">Ngày & Khung giờ</th>
                  <th className="py-3 px-5">Nguồn</th>
                  <th className="py-3 px-5">Tổng tiền</th>
                  <th className="py-3 px-5">Thanh toán</th>
                  <th className="py-3 px-5 text-right">Điểm danh (Check-in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-850/50">
                    <td className="py-3 px-5 font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {b.booking_code}
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {b.customer_name}
                      </div>
                      <div className="text-xs font-mono text-neutral-400">
                        {b.customer_phone}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-xs text-neutral-700 dark:text-neutral-300">
                      {b.court?.name}
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      <div>{formatDate(b.booking_date)}</div>
                      <div className="text-neutral-400">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</div>
                    </td>
                    <td className="py-3 px-5 text-xs font-medium">
                      <Badge variant={b.source === 'website' ? 'sport' : 'neutral'} size="sm">
                        {b.source === 'website' ? 'Website' : 'Tại quầy'}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 font-mono text-xs font-bold text-sport-600">
                      {formatVND(b.total_price)}
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant={b.payment_status === 'paid' ? 'success' : 'warning'}>
                        {b.payment_status === 'paid' ? 'Đã thu tiền' : 'Chưa thu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {b.checked_in ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Đã vào sân
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCheckIn(b.id)}
                          className="text-xs gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Điểm danh
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-neutral-400 text-xs">
                      Không tìm thấy đơn đặt sân phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Counter Booking Modal */}
        {isCounterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sport-100 dark:bg-sport-950 text-sport-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Tạo Đơn Đặt Sân Tại Quầy
                  </h3>
                </div>
                <button
                  onClick={() => setIsCounterModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCounterBooking} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Chọn sân thi đấu *
                  </label>
                  <select
                    value={counterCourtId}
                    onChange={(e) => setCounterCourtId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-semibold"
                  >
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatVND(c.hourly_rate_standard)}/h)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Ngày thi đấu *
                  </label>
                  <input
                    type="date"
                    required
                    value={counterBookingDate}
                    onChange={(e) => setCounterBookingDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Giờ bắt đầu *
                    </label>
                    <input
                      type="time"
                      required
                      value={counterStartTime}
                      onChange={(e) => setCounterStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Giờ kết thúc *
                    </label>
                    <input
                      type="time"
                      required
                      value={counterEndTime}
                      onChange={(e) => setCounterEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Tên khách hàng *
                    </label>
                    <input
                      type="text"
                      required
                      value={counterCustomerName}
                      onChange={(e) => setCounterCustomerName(e.target.value)}
                      placeholder="VD: Anh Nam"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      type="text"
                      required
                      value={counterCustomerPhone}
                      onChange={(e) => setCounterCustomerPhone(e.target.value)}
                      placeholder="0911223344"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                    placeholder="VD: Đã thanh toán tiền mặt tại quầy"
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCounterModalOpen(false)}
                  >
                    Hủy Bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang Tạo Đơn...' : 'Lưu Đơn & Điểm Danh'}
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
