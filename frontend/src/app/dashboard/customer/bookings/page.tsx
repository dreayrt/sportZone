'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { MOCK_BOOKINGS, Booking } from '@/lib/mock-data';
import {
  CalendarDays,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  XCircle,
  Filter,
  Download
} from 'lucide-react';

export default function CustomerBookingsPage() {
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filteredBookings = MOCK_BOOKINGS.filter((b) => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  return (
    <div>
      <DashboardHeader
        title="Lịch Sử Đặt Sân"
        description="Quản lý toàn bộ danh sách các trận đấu bạn đã đặt hoặc đã hoàn thành."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Tất cả ({MOCK_BOOKINGS.length})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'confirmed'
                  ? 'bg-white dark:bg-neutral-800 text-sport-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Sắp diễn ra
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'completed'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Đã thi đấu
            </button>
          </div>

          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
            Xuất file PDF vé đặt
          </Button>
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
                  <Badge variant={b.status === 'confirmed' ? 'sport' : 'neutral'}>
                    {b.status === 'confirmed' ? 'Sắp diễn ra' : 'Đã hoàn thành'}
                  </Badge>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBooking(b)}
                      className="text-xs gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Vé / Mã QR
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* QR Modal Preview */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-5 text-center shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <span className="font-mono text-xs font-semibold text-neutral-500">MÃ CHECK-IN TẠI SÂN</span>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* QR placeholder box */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center space-y-3">
                <div className="w-44 h-44 bg-white p-2 rounded-lg border border-neutral-200 shadow-xs flex items-center justify-center">
                  {/* Generated clean technical QR SVG pattern */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${selectedBooking.booking_code}`}
                    alt="Booking QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-base font-mono font-bold tracking-widest text-neutral-900 dark:text-white">
                  {selectedBooking.booking_code}
                </span>
              </div>

              <div className="text-left text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300">
                <p><strong>Sân:</strong> {selectedBooking.court?.name}</p>
                <p><strong>Giờ chơi:</strong> {selectedBooking.start_time.slice(0, 5)} - {selectedBooking.end_time.slice(0, 5)} ngày {formatDate(selectedBooking.booking_date)}</p>
                <p className="text-neutral-400 text-[11px]">Đưa mã này cho nhân viên tại quầy để xác nhận vào sân.</p>
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
      </div>
    </div>
  );
}
