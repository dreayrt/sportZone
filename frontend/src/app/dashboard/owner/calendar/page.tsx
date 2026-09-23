'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_VENUES, MOCK_BOOKINGS } from '@/lib/mock-data';
import { formatVND } from '@/lib/utils';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, User, Check } from 'lucide-react';

export default function OwnerCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const venue = MOCK_VENUES[0]; // Chấn Hưng
  const courts = venue.courts || [];

  // Hourly slots from 06:00 to 22:00
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Quick helper to check if slot is peak
  const isPeakHour = (time: string) => {
    const hour = parseInt(time.split(':')[0], 10);
    return hour >= 17 && hour <= 21;
  };

  // Mock booking checks
  const getBookingForSlot = (courtId: number, slot: string) => {
    if (courtId === 1 && (slot === '18:00' || slot === '19:00')) {
      return {
        customer_name: 'Nguyễn Minh Anh (0912***678)',
        status: 'confirmed',
        code: 'SZ-77812',
        paid: true,
      };
    }
    if (courtId === 4 && slot === '07:00') {
      return {
        customer_name: 'Lê Thu Trang (Tại quầy)',
        status: 'completed',
        code: 'SZ-66021',
        paid: true,
      };
    }
    return null;
  };

  return (
    <div>
      <DashboardHeader
        title="Lưới Lịch Sân Theo Thời Gian Thực"
        description="Quản lý slot giờ thi đấu trực quan, phân biệt khung giờ thường & giờ cao điểm (Peak Hours)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <ChevronLeft className="w-3.5 h-3.5" />
              Hôm qua
            </Button>
            <div className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono">
              {selectedDate}
            </div>
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              Ngày mai
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex-wrap">
          <span className="font-semibold text-neutral-900 dark:text-white">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-neutral-300 dark:bg-neutral-800"></span>
            <span>Slot giờ thường trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300 dark:bg-amber-950/40"></span>
            <span>Giờ vàng (Peak 17h-21h)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-sport-500 text-white"></span>
            <span>Đã đặt & Đã thanh toán</span>
          </div>
        </div>

        {/* Court Timeline Matrix */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-3 px-4 text-xs font-bold text-neutral-500 w-24 border-r border-neutral-200 dark:border-neutral-700">
                    Khung giờ
                  </th>
                  {courts.map((court) => (
                    <th key={court.id} className="py-3 px-4 text-xs font-bold text-neutral-900 dark:text-white min-w-[200px] border-r last:border-r-0 border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between">
                        <span>{court.name}</span>
                        <span className="font-mono font-normal text-[11px] text-neutral-400">
                          {court.code}
                        </span>
                      </div>
                      <div className="text-[11px] font-normal text-neutral-500 font-mono mt-0.5">
                        {formatVND(court.hourly_rate_standard)}/h
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                {timeSlots.map((slot) => {
                  const peak = isPeakHour(slot);
                  return (
                    <tr key={slot} className="hover:bg-neutral-50/40">
                      <td className={`py-3 px-4 font-mono font-semibold border-r border-neutral-200 dark:border-neutral-700 ${
                        peak ? 'text-amber-600 bg-amber-50/30 dark:bg-amber-950/10' : 'text-neutral-500'
                      }`}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot}
                        </div>
                        {peak && <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500 block">Peak</span>}
                      </td>

                      {courts.map((court) => {
                        const booking = getBookingForSlot(court.id, slot);
                        return (
                          <td
                            key={court.id}
                            className={`p-2 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 ${
                              peak && !booking ? 'bg-amber-50/20 dark:bg-amber-950/5' : ''
                            }`}
                          >
                            {booking ? (
                              <div className="p-2.5 rounded-lg bg-sport-500 text-white space-y-1 shadow-xs">
                                <div className="flex items-center justify-between font-mono text-[10px] opacity-90">
                                  <span>{booking.code}</span>
                                  <span className="bg-white/20 px-1 rounded">Đã TT</span>
                                </div>
                                <div className="font-semibold text-xs truncate">
                                  {booking.customer_name}
                                </div>
                              </div>
                            ) : (
                              <button
                                className="w-full py-2 px-3 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 hover:border-sport-500 hover:bg-sport-50/50 dark:hover:bg-sport-950/20 text-neutral-400 hover:text-sport-600 transition-all flex items-center justify-center gap-1 group"
                                title="Bấm để tạo đơn tại quầy cho slot này"
                              >
                                <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" />
                                <span className="text-[11px] font-medium">Trống • Nhận khách</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
