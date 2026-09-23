'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_BOOKINGS, Booking } from '@/lib/mock-data';
import { formatVND, formatDate } from '@/lib/utils';
import { Plus, Check, QrCode, Search, Filter, Phone, CheckCircle2 } from 'lucide-react';

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [search, setSearch] = useState('');

  const handleCheckIn = (id: number) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, checked_in: true, checked_in_at: new Date().toISOString() } : b));
  };

  const filtered = bookings.filter(b => 
    b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    b.booking_code.toLowerCase().includes(search.toLowerCase()) ||
    b.customer_phone.includes(search)
  );

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Đơn Đặt Sân & Điểm Danh"
        description="Theo dõi toàn bộ đơn đặt từ Website và Tại quầy, xác nhận điểm danh khách vào sân."
        actions={
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Tạo Đơn Tại Quầy
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
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
                  <th className="py-3 px-5">Nguồn đơn</th>
                  <th className="py-3 px-5">Tổng tiền</th>
                  <th className="py-3 px-5">Thanh toán</th>
                  <th className="py-3 px-5 text-right">Điểm danh (Check-in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/50">
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
                        {b.payment_status === 'paid' ? 'Đã thu tiền' : 'Chưa thu đủ'}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-right">
                      {b.checked_in ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Đã vào sân
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => handleCheckIn(b.id)}
                        >
                          Xác nhận vào sân
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
